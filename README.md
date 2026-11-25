# Real-time rendering labs

Interactive WebGL 2 demos of real-time rendering techniques. Each lab draws its intermediate passes next to the final image, so you can see what every step adds.

Open `index.html` to browse the labs. Every lab has two buttons in its top-left corner:

- **All labs** returns to the landing page.
- **Tutorial** opens a step-by-step walkthrough in a panel beside the lab. Drag the panel's edge to resize it.

## Labs

| Group | Lab | Folder |
|---|---|---|
| Foundations | Coordinate spaces | `labs/coordinate-spaces/` |
| Lighting and shadows | Deferred light volumes | `labs/deferred-light-volumes/` |
| Lighting and shadows | Shadow mapping | `labs/shadow-mapping/` |
| Lighting and shadows | Image-based lighting (IBL) | `labs/image-based-lighting/` |
| Screen-space effects | Ambient occlusion (SSAO) | `labs/ssao/` |
| Screen-space effects | Reflections (SSR) | `labs/ssr/` |
| Screen-space effects | Subsurface scattering (SSS) | `labs/sss/` |
| Materials | Realistic skin | `labs/realistic-skin/` |
| Materials | Hair | `labs/hair/` |
| Geometry and effects | Particle systems | `labs/particle-systems/` |
| Geometry and effects | Tessellation and geometry shaders | `labs/tessellation-geometry/` |
| Geometry and effects | Mesh shaders | `labs/mesh-shaders/` |

## Layout

```
index.html                 landing page: the list of labs
labs/<name>/index.html     the lab, a single HTML file
labs/<name>/tutorial.md    the tutorial's source text
labs/<name>/tutorial.html  the tutorial as shown in the panel (built from tutorial.md)
labs/<name>/*.svg          diagrams used by the tutorial
shared/lab-nav.js          adds the "All labs" link and the Tutorial panel to a lab
shared/tutorial.css        styles for the tutorial pages
thumbs/<name>.jpg          screenshot shown on the landing page (960 x 600)
tools/build_tutorials.py   turns every tutorial.md into tutorial.html
.nojekyll                  tells GitHub Pages to serve the files as they are
```

All links are relative, so the site works from any URL and also when opened straight from disk.

Two addresses are useful to know:

- `labs/<name>/index.html#tutorial` opens a lab with its tutorial panel already open.
- `labs/<name>/tutorial.html` is the tutorial on its own page.

## Run locally

Double-click `index.html`, or serve the folder:

```
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Edit a tutorial

Edit `labs/<name>/tutorial.md`, then rebuild the HTML:

```
pip install markdown
python3 tools/build_tutorials.py
```

Commit both files. The built `tutorial.html` is what the site serves, so GitHub Pages needs no build step.

## Add a lab

1. Put the lab at `labs/<name>/index.html`.
2. Add this line just before `</body>` in that file:

   ```html
   <script src="../../shared/lab-nav.js" data-tutorial="tutorial.html" defer></script>
   ```

   Leave out `data-tutorial` if the lab has no tutorial yet. The Tutorial button is then not shown.

3. Write `labs/<name>/tutorial.md` and run `python3 tools/build_tutorials.py <name>`.
4. Save a screenshot as `thumbs/<name>.jpg`.
5. In `index.html`, copy one `<li>` block inside the right group and change the `id`, `href`, image, name, description and "Covers" line. The `id` must be the folder name: the back link uses it to highlight the lab you came from.

The buttons are placed in the lab's row of status chips (an element with the class `hud`), and the panel makes room for itself by shifting the element with the class `app`. A lab without those gets fixed buttons in the corner, and the panel then covers part of the page.

## Publish on GitHub Pages

Push the repository to GitHub, then in the repository's Settings, open Pages and choose "Deploy from a branch" with the `main` branch and the `/ (root)` folder. There is nothing to build.
