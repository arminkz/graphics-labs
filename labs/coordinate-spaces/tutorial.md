# Coordinate spaces: a walkthrough of the Coordinate Spaces Lab

Drag the **Pipeline** slider as you read.

## The big picture

A vertex starts as numbers in a modeling tool and ends as a pixel. Between those two points it passes through six spaces, and each arrow is one simple operation:

```
object ──×M──▶ world ──×V──▶ view ──×P──▶ clip ──÷w──▶ NDC ──viewport──▶ screen
```

In a vertex shader, the first three arrows are the famous line:

```glsl
gl_Position = P * V * M * vec4(position, 1.0);   // this is clip space
```

The GPU does the last two arrows (the divide and the viewport transform) by itself after your vertex shader returns.

In the lab, the **amber frustum** is the scene camera you're studying. The view you orbit with the mouse is a separate "lab" camera that lets you look at everything from outside. The **yellow dot** is the vertex you follow in the table.

## 1. Object space (local / model space)

Coordinates relative to the object's own origin, exactly as authored. The house was modeled around the center of its floor, so that point is `(0, 0, 0)` no matter where the house ends up in the world.

*In the lab:* at stage 1, the house sits at the origin with its own axes (bright red, green, blue). The world grid and the camera look shifted and tilted, because they're drawn relative to the house.

## 2. World space: `p_world = M · p_object`

The **model matrix** `M = T · R · S` (translate · rotate · scale) places the object in one shared space with every other object, light and camera. Physics, gameplay and most lighting work here.

*In the lab:* move the **Object** sliders and watch the M matrix change. The translation sits in the last column, and rotation and scale fill the top-left 3×3 block.

## 3. View space (eye / camera space): `p_view = V · p_world`

The **view matrix** is the *inverse* of the camera's own world transform. Instead of moving the camera, you move the whole world so the camera lands at the origin.

OpenGL convention: the camera looks down **−Z**, with +X to the right and +Y up. Nothing is distorted yet, because this step is only a rotation plus a translation. A point's distance in front of the camera is simply `−z`.

*In the lab:* morph from World to View. The whole scene rotates and slides rigidly until the frustum's tip sits at the origin, pointing down −Z.

## 4. Clip space: `p_clip = P · p_view`

The **projection matrix** produces 4D homogeneous coordinates `(x, y, z, w)`. For a perspective projection, its bottom row is `(0, 0, −1, 0)`, so:

```
w_clip = −z_view          (the distance in front of the camera)
```

That one line is where perspective comes from. A point is inside the view volume when:

```
−w ≤ x ≤ w,   −w ≤ y ≤ w,   −w ≤ z ≤ w
```

The GPU **clips triangles here, before dividing**. A point behind the camera has `w < 0`, and dividing by a negative number would flip it to the other side of the screen. Clipping in this space avoids that.

*In the lab:* the table shows all four components. Move the house with **Position X** until the vertex's coordinates turn red: one of them has crossed ±w.

## 5. NDC (normalized device coordinates): `p_ndc = p_clip.xyz / p_clip.w`

The **perspective divide** turns the frustum into the cube `[−1, 1]³`. Distant things had a larger `w`, so they shrink more, and lines that were parallel in the world now converge.

Two things to notice:

- **Depth is not linear.** The amber ticks are 1 m apart in view space, but in NDC they bunch up toward the far side. Most of the depth buffer's precision is spent close to the near plane. Lower **Near plane** to 0.1 and the bunching gets extreme. This is why a tiny near plane causes z-fighting far away.
- **Handedness flips.** OpenGL's NDC is left-handed: +z points *into* the screen, while view space looked down −z. Direct3D, Vulkan and Metal use `z ∈ [0, 1]` instead of `[−1, 1]`.

With an **orthographic** projection, `w` stays 1, so the divide changes nothing. Depth stays linear and parallel lines stay parallel.

## 6. Screen space (window / pixel space): the viewport transform

```
x_px  = (x_ndc + 1) / 2 · width
y_px  = (y_ndc + 1) / 2 · height
depth = (z_ndc + 1) / 2          → written to the depth buffer
```

The rasterizer works here: it finds which pixels each triangle covers and interpolates attributes across them. In OpenGL and WebGL, `(0, 0)` is the **bottom-left** corner. Direct3D, Vulkan and Metal put it at the **top-left**, so y is flipped.

*In the lab:* the screen stage is NDC stretched to the viewport's aspect ratio and flattened into a thin depth slab. Compare it with the **Camera's image** in the top-right corner: same shape. Switch the viewport to **360 × 640** and notice that NDC doesn't change at all. Only this last step depends on the window size.

## Worked example (default settings, vertex #9: roof ridge, right end)

| Space | Coordinates | How you get there |
|---|---|---|
| Object | (0.50, 1.15, 0.00, 1) | as modeled |
| World | (0.54, 1.38, −0.25, 1) | × M (scale 1.2, rotate 25°) |
| View | (0.59, 0.71, −4.66, 1) | × V: the point is 4.66 units in front of the camera |
| Clip | (0.64, 1.36, 3.98, **4.66**) | × P: w = −z_view = 4.66 |
| NDC | (0.14, 0.29, 0.85) | ÷ 4.66 |
| Screen | (363.8, 232.7) px, depth 0.927 | (0.14 + 1) / 2 × 640 = 363.8 |

Notice that the vertex is at only about 50% of the camera's distance range, yet its depth value is already 0.927. That's the non-linear depth from step 5 in action.

## Things to try

1. Drag the slider slowly from **Object** to **Screen** while watching the yellow vertex and its row in the table.
2. At **NDC**, look at the depth ticks, then set **Near plane** to 0.1.
3. Switch to **Orthographic**: w stays 1 and the divide does nothing.
4. At **Clip**, move the house sideways until the vertex turns red. It has crossed ±w and would be clipped.
5. Set the viewport to **360 × 640**: NDC stays the same cube, and only the screen step changes.

## Cheat sheet

| From → To | Operation | Who does it |
|---|---|---|
| Object → World | `M · p` | you (vertex shader) |
| World → View | `V · p`, with V = inverse(camera transform) | you (vertex shader) |
| View → Clip | `P · p` | you (vertex shader) → `gl_Position` |
| Clip → NDC | `xyz / w` (after clipping) | GPU, fixed function |
| NDC → Screen | viewport transform + depth range | GPU, set by `glViewport` / `glDepthRange` |
