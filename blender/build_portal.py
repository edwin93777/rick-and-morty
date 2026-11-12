"""
Portal fluido de la pantalla de carga (Rick and Morty Explorer).

Se ejecuta DENTRO de Blender (probado en 5.3): pestaña Scripting -> abrir este
archivo -> Run Script. Genera:

  - la escena: colección "Portal" (modelo animado) y "Portal_Preview" (cámara y luces),
  - src/assets/portal/portal-noise.webp   textura de ruido que se repite sin costuras,
  - src/assets/portal/portal.glb          modelo + animación para three.js,
  - blender/portal.blend                  archivo fuente.

Cómo está hecho el vórtice
--------------------------
Cada capa del embudo tiene dos mapas UV:

  FlowUV   U = ángulo + TWIST * lambda,  V = lambda   (lambda = 0 borde, 1 centro, logarítmico)
  PolarUV  U = ángulo,                   V = radio (0 centro, 1 borde)

Con FlowUV, las líneas de U constante son espirales logarítmicas. Desplazar la
textura en V hace que el dibujo viaje del borde al centro siguiendo esas
espirales, y desplazarla en U lo hace girar: ese es el movimiento de vórtice.
PolarUV solo sirve para saber a qué distancia del centro está cada punto.

El borde viscoso usa shape keys: pares seno/coseno cuya mezcla produce ondas
que viajan alrededor del óvalo.
"""

import json
import math
import os
import struct

import bmesh
import bpy
import numpy as np

TAU = math.tau

# ---------------------------------------------------------------- rutas
try:
    HERE = os.path.dirname(os.path.abspath(__file__))
except NameError:
    HERE = bpy.path.abspath("//")
if not os.path.isdir(HERE) or not os.path.basename(HERE) == "blender":
    HERE = bpy.path.abspath("//") or HERE

PROJECT = os.path.dirname(HERE.rstrip("\\/"))
ASSET_DIR = os.path.join(PROJECT, "src", "assets", "portal")
NOISE_PATH = os.path.join(ASSET_DIR, "portal-noise.webp")
GLB_PATH = os.path.join(ASSET_DIR, "portal.glb")
BLEND_PATH = os.path.join(HERE, "portal.blend")

# ---------------------------------------------------------------- parámetros
RADIUS_X = 0.66  # semieje horizontal del óvalo
RADIUS_Z = 1.0  # semieje vertical
S_MIN = 0.04  # radio (normalizado) donde termina el embudo
TWIST = 1.25  # vueltas extra de la espiral entre el borde y el centro
FUNNEL_POWER = 1.6

FPS = 24
LOOP = 96  # fotogramas del bucle (4 s); el 97 repite el 1

# Capas del embudo, de la más profunda a la más cercana a la cámara.
# `front` es la posición en Y del borde (negativo = hacia la cámara).
LAYERS = {
    "Deep": dict(rings=24, segs=80, s_outer=1.0, s_inner=S_MIN, depth=0.70, front=0.0, ridge=0.03, cap=True),
    "Flow": dict(rings=20, segs=72, s_outer=0.97, s_inner=0.07, depth=0.42, front=-0.07),
    "Glints": dict(rings=16, segs=64, s_outer=0.94, s_inner=0.11, depth=0.20, front=-0.15),
}

# Muestreos de la textura: escala (U, V) y velocidad (giro, entrada) en unidades de
# textura por segundo. Estos mismos valores están en src/three/portalScene.js.
SAMPLES = {
    "deep_arms": dict(scale=(1.0, 0.8), speed=(0.05, 0.11)),
    "deep_detail": dict(scale=(2.0, 1.6), speed=(0.10, 0.26)),
    "flow_streaks": dict(scale=(2.0, 1.9), speed=(0.16, 0.42)),
    "flow_blobs": dict(scale=(1.0, 1.1), speed=(0.07, 0.20)),
    "glints": dict(scale=(1.0, 1.4), speed=(0.10, 0.42)),
}

PALETTE = {
    "dark": "#0a6a17",
    "mid": "#18a01d",
    "lime": "#4bd817",
    "lime_light": "#8cec2b",
    "lime_bright": "#86ea25",
    "yellow": "#e4f658",
    "white": "#f8ffe0",
    "slime": "#55de1a",
    "slime_glow": "#1c9c12",
}

# Borde viscoso
RIM_SEGS = 96
RIM_TUBE_SEGS = 12
RIM_TUBE = 0.105  # radio medio del tubo
RIM_FRONT = -0.05
RIM_SQUASH = 0.85  # aplastado en profundidad
RIM_OUTWARD = 0.35  # cuánto empuja hacia fuera un bulto además de engordar
RIM_STATIC = 0.20  # bultos fijos
# (nombre, nº de bultos, amplitud, vueltas de fase por bucle)
RIM_WAVES = [("WaveA", 7, 0.22, 2), ("WaveB", 11, 0.14, 1)]

DROP_COUNT = 9

NOISE_NAME = "portal_noise"
COLLECTION = "Portal"
PREVIEW_COLLECTION = "Portal_Preview"


def srgb(hex_color):
    """'#rrggbb' -> RGBA lineal (lo que espera Blender)."""
    h = hex_color.lstrip("#")
    channels = [int(h[i : i + 2], 16) / 255 for i in (0, 2, 4)]
    linear = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in channels]
    return (*linear, 1.0)


def lam_of(s):
    """Radio normalizado -> lambda logarítmica (0 en el borde, 1 en S_MIN)."""
    return math.log(1.0 / s) / math.log(1.0 / S_MIN)


# ================================================================ textura
def periodic_noise(size, cells_x, cells_y, rng):
    """Ruido de valores con interpolación suave que se repite en ambos ejes."""
    lattice = rng.random((cells_y, cells_x))
    ys = np.linspace(0, cells_y, size, endpoint=False)
    xs = np.linspace(0, cells_x, size, endpoint=False)
    y0, x0 = np.floor(ys).astype(int), np.floor(xs).astype(int)
    fy, fx = ys - y0, xs - x0
    fy = fy * fy * fy * (fy * (fy * 6 - 15) + 10)
    fx = fx * fx * fx * (fx * (fx * 6 - 15) + 10)
    y1, x1 = (y0 + 1) % cells_y, (x0 + 1) % cells_x
    fx, fy = fx[None, :], fy[:, None]
    top = lattice[np.ix_(y0, x0)] * (1 - fx) + lattice[np.ix_(y0, x1)] * fx
    bottom = lattice[np.ix_(y1, x0)] * (1 - fx) + lattice[np.ix_(y1, x1)] * fx
    return top * (1 - fy) + bottom * fy


def fbm(size, cells_x, cells_y, octaves, rng, gain=0.5):
    total, amplitude = np.zeros((size, size)), 1.0
    for octave in range(octaves):
        total += amplitude * periodic_noise(size, cells_x * 2**octave, cells_y * 2**octave, rng)
        amplitude *= gain
    return total


def equalize(field):
    """Reparte los valores uniformemente en 0..1: un umbral t deja visible (1 - t) del área."""
    flat = field.ravel()
    ranks = np.empty(flat.size, dtype=np.float64)
    ranks[flat.argsort()] = np.arange(flat.size)
    return (ranks / (flat.size - 1)).reshape(field.shape)


def speck_field(size, rng, count):
    """Manchitas gaussianas. FlowUV está inclinado (una espiral), así que en la malla
    se estiran a lo largo del flujo: por eso aquí son más cortas en V que en U."""
    ys, xs = np.mgrid[0:size, 0:size] / size
    field = np.zeros((size, size))
    for _ in range(count):
        cx, cy = rng.random(2)
        ru = rng.uniform(0.011, 0.028)
        rv = ru * rng.uniform(0.5, 0.95)
        dx = np.abs(xs - cx)
        dy = np.abs(ys - cy)
        dx, dy = np.minimum(dx, 1 - dx), np.minimum(dy, 1 - dy)
        field = np.maximum(field, np.exp(-((dx / ru) ** 2 + (dy / rv) ** 2)))
    return field


def make_noise_image(size=512, seed=7):
    """R = brazos grandes, G = vetas medianas, B = motas."""
    rng = np.random.default_rng(seed)
    rgba = np.ones((size, size, 4), dtype=np.float32)
    rgba[..., 0] = equalize(fbm(size, 5, 2, 3, rng, gain=0.45))
    rgba[..., 1] = equalize(fbm(size, 9, 3, 3, rng, gain=0.5))
    rgba[..., 2] = speck_field(size, rng, count=60)

    old = bpy.data.images.get(NOISE_NAME)
    if old:
        bpy.data.images.remove(old)
    image = bpy.data.images.new(NOISE_NAME, size, size, alpha=False)
    image.colorspace_settings.name = "Non-Color"
    image.pixels.foreach_set(rgba.ravel())
    image.update()

    os.makedirs(ASSET_DIR, exist_ok=True)
    image.filepath_raw = NOISE_PATH
    image.file_format = "WEBP"
    image.save(quality=95)
    image.pack()
    return image


# ================================================================ escena
def reset_collection(name):
    """Vacía (o crea) una colección de este script sin tocar nada más de la escena."""
    scene = bpy.context.scene
    collection = bpy.data.collections.get(name)
    if collection is None:
        collection = bpy.data.collections.new(name)
        scene.collection.children.link(collection)
    for obj in list(collection.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    return collection


def purge_own_datablocks():
    for mesh in list(bpy.data.meshes):
        if mesh.name.startswith("Portal_") and mesh.users == 0:
            bpy.data.meshes.remove(mesh)
    for material in list(bpy.data.materials):
        if material.name.startswith("M_Portal_"):
            bpy.data.materials.remove(material)


def add_object(name, data, collection, parent=None):
    obj = bpy.data.objects.new(name, data)
    collection.objects.link(obj)
    if parent is not None:
        obj.parent = parent
    return obj


# ================================================================ mallas
def build_funnel(name, rings, segs, s_outer, s_inner, depth, front, ridge=0.0, ridge_arms=3, cap=False):
    """Embudo en espiral logarítmica, mirando hacia -Y (frente de Blender)."""
    lam_outer, lam_inner = lam_of(s_outer), lam_of(s_inner)
    ring_lam = [lam_outer + (lam_inner - lam_outer) * i / (rings - 1) for i in range(rings)]
    ring_s = [S_MIN**lam for lam in ring_lam]

    def height(lam, s, u_spiral):
        relief = ridge * math.sqrt(s) * (1 - lam**3) * math.cos(TAU * ridge_arms * u_spiral)
        return front + depth * lam**FUNNEL_POWER - relief

    verts = []
    for lam, s in zip(ring_lam, ring_s):
        for j in range(segs):
            theta = TAU * j / segs
            y = height(lam, s, j / segs + TWIST * lam)
            verts.append((RADIUS_X * s * math.cos(theta), y, RADIUS_Z * s * math.sin(theta)))

    faces, flow_uv, polar_uv = [], [], []

    def corner(i, j):
        flow_uv.extend((j / segs + TWIST * ring_lam[i], ring_lam[i]))
        polar_uv.extend((j / segs, ring_s[i]))
        return i * segs + (j % segs)

    for i in range(rings - 1):
        for j in range(segs):
            faces.append([corner(i, j), corner(i, j + 1), corner(i + 1, j + 1), corner(i + 1, j)])

    if cap:
        last = rings - 1
        lam_c = lam_inner + 0.15
        center = len(verts)
        verts.append((0.0, front + depth * lam_c**FUNNEL_POWER, 0.0))
        for j in range(segs):
            a, b = corner(last, j), corner(last, j + 1)
            flow_uv.extend(((j + 0.5) / segs + TWIST * lam_c, lam_c))
            polar_uv.extend(((j + 0.5) / segs, 0.0))
            faces.append([a, b, center])

    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.uv_layers.new(name="FlowUV").data.foreach_set("uv", flow_uv)
    mesh.uv_layers.new(name="PolarUV").data.foreach_set("uv", polar_uv)
    mesh.uv_layers.active = mesh.uv_layers["FlowUV"]
    mesh.shade_smooth()
    mesh.update()
    return mesh


def rim_arrays():
    """Coordenadas base del borde y desplazamientos de cada shape key."""
    theta = np.arange(RIM_SEGS) / RIM_SEGS * TAU
    phi = np.arange(RIM_TUBE_SEGS) / RIM_TUBE_SEGS * TAU
    ct, st = np.cos(theta), np.sin(theta)

    center = np.stack([RADIUS_X * ct, np.full(RIM_SEGS, RIM_FRONT), RADIUS_Z * st], axis=1)
    outward = np.stack([RADIUS_Z * ct, np.zeros(RIM_SEGS), RADIUS_X * st], axis=1)
    outward /= np.linalg.norm(outward, axis=1, keepdims=True)
    toward_camera = np.array([0.0, -1.0, 0.0])

    ring_dir = (
        np.cos(phi)[None, :, None] * outward[:, None, :]
        + (np.sin(phi) * RIM_SQUASH)[None, :, None] * toward_camera[None, None, :]
    )
    bulge_dir = ring_dir + RIM_OUTWARD * outward[:, None, :]

    lumps = 0.55 * np.sin(3 * theta + 1.3) + 0.30 * np.sin(7 * theta + 0.4) + 0.25 * np.sin(4 * theta + 2.2)
    basis = center[:, None, :] + RIM_TUBE * ring_dir + RIM_TUBE * RIM_STATIC * lumps[:, None, None] * bulge_dir

    deltas = {}
    for name, count, amplitude, _cycles in RIM_WAVES:
        deltas[f"{name}_sin"] = RIM_TUBE * amplitude * np.sin(count * theta)[:, None, None] * bulge_dir
        deltas[f"{name}_cos"] = RIM_TUBE * amplitude * np.cos(count * theta)[:, None, None] * bulge_dir
    return basis.reshape(-1, 3), {key: value.reshape(-1, 3) for key, value in deltas.items()}


def build_rim(collection, parent, material):
    basis, deltas = rim_arrays()

    def vid(m, q):
        return (m % RIM_SEGS) * RIM_TUBE_SEGS + (q % RIM_TUBE_SEGS)

    faces = [
        [vid(m, q), vid(m + 1, q), vid(m + 1, q + 1), vid(m, q + 1)]
        for m in range(RIM_SEGS)
        for q in range(RIM_TUBE_SEGS)
    ]
    mesh = bpy.data.meshes.new("Portal_Rim")
    mesh.from_pydata(basis.tolist(), [], faces)
    mesh.shade_smooth()
    mesh.materials.append(material)
    obj = add_object("Portal_Rim", mesh, collection, parent)

    obj.shape_key_add(name="Basis", from_mix=False)
    blocks = {}
    for key, delta in deltas.items():
        block = obj.shape_key_add(name=key, from_mix=False)
        block.data.foreach_set("co", (basis + delta).ravel())
        block.slider_min, block.slider_max = -1.0, 1.0
        blocks[key] = block

    # sin(k·θ + ω·t) = sin(k·θ)·cos(ω·t) + cos(k·θ)·sin(ω·t): la onda viaja en sentido horario.
    for frame in range(1, LOOP + 2):
        t = (frame - 1) / LOOP
        for name, _count, _amplitude, cycles in RIM_WAVES:
            phase = TAU * cycles * t
            for suffix, value in (("sin", math.cos(phase)), ("cos", math.sin(phase))):
                block = blocks[f"{name}_{suffix}"]
                block.value = value
                block.keyframe_insert("value", frame=frame)
    return obj


def build_drops(collection, parent, material):
    """Gotas que salen despedidas del borde, caen un poco y se encogen."""
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=14, v_segments=9, radius=1.0)
    mesh = bpy.data.meshes.new("Portal_Drop")
    bm.to_mesh(mesh)
    bm.free()
    mesh.shade_smooth()
    mesh.materials.append(material)

    rng = np.random.default_rng(11)
    drops = []
    for index in range(DROP_COUNT):
        theta = TAU * (index + rng.uniform(-0.3, 0.3)) / DROP_COUNT
        ct, st = math.cos(theta), math.sin(theta)
        outward = np.array([RADIUS_Z * ct, 0.0, RADIUS_X * st])
        outward /= np.linalg.norm(outward)
        # nacen en la superficie del borde, no dentro del tubo
        start = np.array([RADIUS_X * ct, RIM_FRONT, RADIUS_Z * st]) + outward * RIM_TUBE * 0.8
        tangent = np.array([st, 0.0, -ct])  # sentido horario visto de frente
        travel = (
            outward * rng.uniform(0.26, 0.42)
            + tangent * rng.uniform(0.08, 0.2)
            + np.array([0.0, rng.uniform(-0.2, -0.04), 0.0])
        )
        size = rng.uniform(0.03, 0.062)
        phase = rng.random()
        cycles = 1 if size > 0.045 else 2  # las pequeñas salen el doble de veces

        obj = add_object(f"Portal_Drop_{index + 1:02d}", mesh, collection, parent)
        for frame in range(1, LOOP + 2):
            tau = ((frame - 1) / LOOP * cycles + phase) % 1.0
            eased = 1 - (1 - tau) ** 2
            position = start + travel * eased + np.array([0.0, 0.0, -0.22 * tau * tau])
            scale = max(size * math.sin(math.pi * tau) ** 0.6 * (1 - 0.45 * tau), 1e-4)
            obj.location = position
            obj.scale = (scale, scale, scale)
            obj.keyframe_insert("location", frame=frame)
            obj.keyframe_insert("scale", frame=frame)
        drops.append(obj)
    return drops


# ================================================================ materiales
def new_material(name):
    material = bpy.data.materials.new(name)
    try:
        material.use_nodes = True
    except Exception:
        pass
    material.node_tree.nodes.clear()
    return material


def build_slime_material():
    material = new_material("M_Portal_Slime")
    nodes, links = material.node_tree.nodes, material.node_tree.links
    bsdf = nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Base Color"].default_value = srgb(PALETTE["slime"])
    bsdf.inputs["Roughness"].default_value = 0.16
    bsdf.inputs["Emission Color"].default_value = srgb(PALETTE["slime_glow"])
    bsdf.inputs["Emission Strength"].default_value = 0.6
    output = nodes.new("ShaderNodeOutputMaterial")
    output.location = (300, 0)
    links.new(bsdf.outputs["BSDF"], output.inputs["Surface"])
    return material


class Graph:
    """Ayudante mínimo para montar árboles de nodos por código."""

    def __init__(self, material, image):
        self.tree = material.node_tree
        self.image = image
        self.count = 0
        self.flow_uv = self.node("ShaderNodeUVMap", uv_map="FlowUV").outputs["UV"]
        polar = self.node("ShaderNodeUVMap", uv_map="PolarUV").outputs["UV"]
        split = self.node("ShaderNodeSeparateXYZ")
        self.tree.links.new(polar, split.inputs[0])
        self.radius = split.outputs["Y"]

    def node(self, node_type, **props):
        node = self.tree.nodes.new(node_type)
        node.location = ((self.count // 4) * 200, -(self.count % 4) * 220)
        self.count += 1
        for key, value in props.items():
            setattr(node, key, value)
        return node

    def plug(self, source, socket):
        if isinstance(source, bpy.types.NodeSocket):
            self.tree.links.new(source, socket)
        else:
            socket.default_value = source

    def sample(self, key):
        """Muestra la textura con la escala y la velocidad de SAMPLES[key]."""
        scale, speed = SAMPLES[key]["scale"], SAMPLES[key]["speed"]
        mapping = self.node("ShaderNodeMapping", vector_type="POINT")
        self.tree.links.new(self.flow_uv, mapping.inputs["Vector"])
        mapping.inputs["Scale"].default_value = (scale[0], scale[1], 1.0)
        # Giro (+U) y entrada hacia el centro (-V), ligados al fotograma actual.
        for axis, rate in ((0, speed[0]), (1, -speed[1])):
            driver = mapping.inputs["Location"].driver_add("default_value", axis).driver
            driver.type = "SCRIPTED"
            driver.expression = f"{rate:.4f} * (frame - 1) / {FPS}"
        texture = self.node("ShaderNodeTexImage", image=self.image, interpolation="Linear", extension="REPEAT")
        self.tree.links.new(mapping.outputs["Vector"], texture.inputs["Vector"])
        split = self.node("ShaderNodeSeparateColor")
        self.tree.links.new(texture.outputs["Color"], split.inputs[0])
        return split.outputs

    def math(self, operation, a, b=None):
        node = self.node("ShaderNodeMath", operation=operation)
        self.plug(a, node.inputs[0])
        if b is not None:
            self.plug(b, node.inputs[1])
        return node.outputs[0]

    def smoothstep(self, edge0, edge1, value):
        node = self.node("ShaderNodeMapRange", interpolation_type="SMOOTHSTEP")
        self.plug(value, node.inputs["Value"])
        node.inputs["From Min"].default_value = edge0
        node.inputs["From Max"].default_value = edge1
        return node.outputs["Result"]

    def mix(self, factor, a, b):
        node = self.node("ShaderNodeMix", data_type="RGBA")
        sockets = {socket.identifier: socket for socket in node.inputs}
        self.plug(factor, sockets["Factor_Float"])
        self.plug(a, sockets["A_Color"])
        self.plug(b, sockets["B_Color"])
        return {socket.identifier: socket for socket in node.outputs}["Result_Color"]

    def finish(self, color, alpha=None):
        emission = self.node("ShaderNodeEmission")
        self.plug(color, emission.inputs["Color"])
        surface = emission.outputs[0]
        if alpha is not None:
            transparent = self.node("ShaderNodeBsdfTransparent")
            mixer = self.node("ShaderNodeMixShader")
            self.plug(alpha, mixer.inputs[0])
            self.tree.links.new(transparent.outputs[0], mixer.inputs[1])
            self.tree.links.new(surface, mixer.inputs[2])
            surface = mixer.outputs[0]
        output = self.node("ShaderNodeOutputMaterial")
        self.tree.links.new(surface, output.inputs["Surface"])


def build_vortex_materials(image):
    """Materiales de vista previa; el shader definitivo de la web está en portalScene.js."""
    color = {key: srgb(value) for key, value in PALETTE.items()}
    materials = {}

    # --- capa profunda: brazos oscuros sobre verde medio, franja lima y núcleo claro
    material = new_material("M_Portal_Deep")
    g = Graph(material, image)
    arms = g.sample("deep_arms")["Red"]
    detail = g.sample("deep_detail")["Green"]
    result = g.mix(g.math("GREATER_THAN", arms, 0.52), color["mid"], color["dark"])
    edge = g.math("ADD", g.radius, g.math("MULTIPLY", g.math("SUBTRACT", detail, 0.5), 0.20))
    result = g.mix(g.math("GREATER_THAN", edge, 0.80), result, color["lime"])
    result = g.mix(g.math("GREATER_THAN", edge, 0.92), result, color["lime_light"])
    core = g.math("ADD", g.radius, g.math("MULTIPLY", g.math("SUBTRACT", arms, 0.5), 0.05))
    result = g.mix(g.math("LESS_THAN", core, 0.13), result, color["lime"])
    result = g.mix(g.math("LESS_THAN", core, 0.075), result, color["yellow"])
    g.finish(result)
    materials["Deep"] = material

    def window(graph):
        inner = graph.smoothstep(0.10, 0.30, graph.radius)
        outer = graph.math("SUBTRACT", 1.0, graph.smoothstep(0.86, 1.0, graph.radius))
        return graph.math("MULTIPLY", inner, outer)

    # --- capa de flujo: vetas lima con corazón amarillo
    material = new_material("M_Portal_Flow")
    g = Graph(material, image)
    streaks = g.sample("flow_streaks")["Green"]
    blobs = g.sample("flow_blobs")["Red"]
    field = g.math("ADD", g.math("MULTIPLY", streaks, 0.75), g.math("MULTIPLY", blobs, 0.25))
    field = g.math("ADD", field, g.math("MULTIPLY", g.math("SUBTRACT", window(g), 1.0), 0.18))
    result = g.mix(g.math("GREATER_THAN", field, 0.80), color["lime_bright"], color["yellow"])
    g.finish(result, alpha=g.math("GREATER_THAN", field, 0.66))
    materials["Flow"] = material

    # --- motas blancas, la capa más cercana
    material = new_material("M_Portal_Glints")
    g = Graph(material, image)
    specks = g.sample("glints")["Blue"]
    field = g.math("MULTIPLY", specks, window(g))
    g.finish(color["white"], alpha=g.math("GREATER_THAN", field, 0.5))
    materials["Glints"] = material

    return materials


# ================================================================ vista previa
def build_preview(collection):
    scene = bpy.context.scene

    camera_data = bpy.data.cameras.new("Portal_Camera")
    camera_data.sensor_fit = "VERTICAL"
    camera_data.angle_y = math.radians(24)
    camera = add_object("Portal_Camera", camera_data, collection)
    camera.location = (0.0, -7.4, 0.0)
    camera.rotation_euler = (math.radians(90), 0.0, 0.0)
    scene.camera = camera

    key_data = bpy.data.lights.new("Portal_Key", "SUN")
    key_data.energy = 3.2
    key = add_object("Portal_Key", key_data, collection)
    key.rotation_euler = (math.radians(58), math.radians(-12), math.radians(-28))

    fill_data = bpy.data.lights.new("Portal_Fill", "POINT")
    fill_data.energy = 260
    fill_data.color = (0.6, 1.0, 0.5)
    fill = add_object("Portal_Fill", fill_data, collection)
    fill.location = (1.8, -2.6, -1.2)

    scene.render.resolution_x, scene.render.resolution_y = 540, 720
    scene.render.film_transparent = True
    scene.view_settings.view_transform = "Standard"
    scene.render.fps = FPS
    scene.frame_start, scene.frame_end = 1, LOOP + 1
    if scene.world and scene.world.node_tree:
        background = scene.world.node_tree.nodes.get("Background")
        if background:
            background.inputs[0].default_value = (0.02, 0.05, 0.03, 1.0)
            background.inputs[1].default_value = 0.6


# ================================================================ exportación
def export_glb(collection):
    window = bpy.context.window_manager.windows[0]
    with bpy.context.temp_override(window=window):
        for obj in bpy.context.view_layer.objects:
            obj.select_set(False)
        for obj in collection.all_objects:
            obj.select_set(True)
        bpy.context.view_layer.objects.active = collection.all_objects[0]
        bpy.ops.export_scene.gltf(
            filepath=GLB_PATH,
            export_format="GLB",
            use_selection=True,
            export_yup=True,
            export_apply=False,
            export_texcoords=True,
            export_normals=True,
            export_materials="EXPORT",
            export_image_format="NONE",  # la textura va aparte (portal-noise.webp)
            export_vertex_color="NONE",
            export_cameras=False,
            export_lights=False,
            export_animations=True,
            export_animation_mode="SCENE",
            export_anim_scene_split_object=False,
            export_frame_range=True,
            export_anim_slide_to_zero=True,  # el clip empieza en t = 0 y dura 4 s exactos
            export_force_sampling=True,
            export_optimize_animation_size=False,
            export_morph=True,
            export_morph_normal=True,
            export_morph_tangent=False,
            export_morph_animation=True,
        )
        for obj in collection.all_objects:
            obj.select_set(False)


def describe_glb(path):
    """Resumen del GLB exportado (para comprobar qué contiene)."""
    with open(path, "rb") as handle:
        handle.read(12)
        length, _kind = struct.unpack("<II", handle.read(8))
        data = json.loads(handle.read(length))
    return {
        "bytes": os.path.getsize(path),
        "nodes": [node.get("name") for node in data.get("nodes", [])],
        "meshes": {
            mesh["name"]: {
                "attributes": sorted(mesh["primitives"][0]["attributes"].keys()),
                "targets": len(mesh["primitives"][0].get("targets", [])),
                "vertices": data["accessors"][mesh["primitives"][0]["attributes"]["POSITION"]]["count"],
            }
            for mesh in data.get("meshes", [])
        },
        "materials": [material.get("name") for material in data.get("materials", [])],
        "animations": [
            {
                "name": animation.get("name"),
                "channels": len(animation["channels"]),
                "paths": sorted({channel["target"]["path"] for channel in animation["channels"]}),
                "seconds": max(
                    data["accessors"][sampler["input"]]["max"][0] for sampler in animation["samplers"]
                ),
            }
            for animation in data.get("animations", [])
        ],
        "extensions": data.get("extensionsUsed", []),
    }


# ================================================================ principal
def build(export=True, save=True):
    scene = bpy.context.scene
    collection = reset_collection(COLLECTION)
    preview = reset_collection(PREVIEW_COLLECTION)
    purge_own_datablocks()

    image = make_noise_image()
    vortex_materials = build_vortex_materials(image)
    slime = build_slime_material()

    root = add_object("Portal_Root", None, collection)
    root.empty_display_size = 0.3

    for layer, params in LAYERS.items():
        mesh = build_funnel(f"Portal_{layer}", **params)
        mesh.materials.append(vortex_materials[layer])
        add_object(f"Portal_{layer}", mesh, collection, root)

    build_rim(collection, root, slime)
    build_drops(collection, root, slime)
    build_preview(preview)
    scene.frame_set(1)

    summary = {"noise": NOISE_PATH, "objects": [obj.name for obj in collection.objects]}
    if export:
        export_glb(collection)
        summary["glb"] = describe_glb(GLB_PATH)
    if save:
        bpy.ops.wm.save_as_mainfile(filepath=BLEND_PATH)
        summary["blend"] = BLEND_PATH
    return summary


if __name__ == "__main__":
    print(build())
