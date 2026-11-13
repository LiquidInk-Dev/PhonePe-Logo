# PhonePe Experience

A drop-in React component that renders the animated 3D particle PhonePe logo.

About 7,000 small shapes start as a flat disk, scatter, and then fly together into the PhonePe logo. Pointer and touch input pushes them around.

You choose how the animation advances. You pass a number from `0` to `1` (usually scroll progress), and the component plays the matching point of the timeline.

It works with **React 16.8 and later** (hooks), and it's safe to server-render (Gatsby, SSR).

---

## 1. Quick start

```jsx
import React, { useRef } from "react";
import Experience from "./PhonePeExperience";

const MODELS = {
  phonePe: "/assets/models/MidPolyPhonepe.glb",
  disk: "/assets/models/MidPolyDisk.glb",
};

const TEXTURES = [
  "/assets/shapes/1.webp",
  "/assets/shapes/2.webp",
  "/assets/shapes/3.webp",
  "/assets/shapes/4.webp",
];

export default function Hero() {
  const progressRef = useRef(0);

  return (
    <div style={{ height: "50vh" }}>
      <Experience
        progressRef={progressRef}
        models={MODELS}
        textures={TEXTURES}
      />
    </div>
  );
}
```

This renders the first frame of the animation. To make it play, see [Driving the animation](#4-driving-the-animation).

---

## 2. Installation

### 2.1 Requirements

|         |                                                                                                       |
| ------- | ----------------------------------------------------------------------------------------------------- |
| React   | **16.8+** (hooks). Tested with 16.12.0 and 16.14.0. Uses the classic JSX runtime (`import React`), so it needs no 16.14+ features. |
| Browser | WebGL 2                                                                                               |
| Bundler | Any that can import `.js`/`.jsx` and `.json`, such as Gatsby 4+, webpack 5, Vite, Rspack or Parcel   |

The component is plain three.js inside one React component. It doesn't use `@react-three/fiber`, `@react-three/drei` or `@theatre/r3f`, which all need React 17 or 19.

It doesn't use any bundler-specific features. There are no `?raw` imports, no `import.meta.env`, and no special loaders. It also avoids `?.` and `??`, so it compiles even with older Babel setups.

### 2.2 Install dependencies

```bash
npm install three three-mesh-bvh @theatre/core
npm install -D @theatre/studio
npm install -D @types/three # optional: editor autocomplete
```

These are the versions it was built and tested with:

| Package                           | Version |
| --------------------------------- | ------- |
| `react`, `react-dom`              | 16.12.0 (also checked on 16.14.0) |
| `three`                           | 0.186   |
| `three-mesh-bvh`                  | 0.9     |
| `@theatre/core`, `@theatre/studio` | 0.7.2   |

`@theatre/studio` only runs in **development** builds (see section 6), so it can be a devDependency. Keep it installed anyway: the source references it, and your bundler needs to resolve it during development.

`gsap` is **not** a dependency of the component. You only need it if you use the scroll recipe in section 4.

### 2.3 Copy the files

1. Copy the whole `PhonePeExperience/` folder anywhere in your source tree.
2. Copy the assets into your static/public folder (in Gatsby: `static/`). They must be reachable by URL:

```
static/
  assets/
    models/
      MidPolyPhonepe.glb
      MidPolyDisk.glb
    shapes/
      1.webp
      2.webp
      3.webp
      4.webp
```

You can put the assets anywhere, including a CDN, as long as the URLs you pass in `models` and `textures` point to them. If they're on a different origin, that origin must send CORS headers.

> **Use absolute URLs** (`/assets/...` or `https://...`). A relative URL like `assets/...` resolves against the current page, so it breaks on nested routes such as `/offers/summer`. In Gatsby with a `pathPrefix`, wrap them with `withPrefix('/assets/...')`.

### 2.4 Folder contents

```
PhonePeExperience/
  index.js                 Public exports
  Experience.jsx           The React component (thin wrapper, React 16+)
  createExperience.js      Renderer, camera, asset loading, render loop, cleanup
  PhonePeLogo.js           Particles: geometry, material, mouse physics
  helpers/
    meshToPoints.js        Samples points inside the GLB meshes
    pointer.js             Mouse and touch tracking that doesn't block scrolling
  shaders/
    plane.vert.js          Vertex shader (GLSL as a JS string)
    plane.frag.js          Fragment shader (GLSL as a JS string)
  theatre/
    init.js                Theatre project, sheet and studio loader
    bindTransform.js       Links a Theatre object to a three.js object's position/rotation/scale
    PhonePe.theatre-project-state.json   The animation
```

Import only from `index.js`. Treat everything else as internal.

`Experience.jsx` holds no 3D logic. It creates a `<div>` and calls `createExperience(div, options)` in a `useEffect`. Everything else is framework-agnostic three.js.

---

## 3. Props

```js
/**
 * @typedef {object} ExperienceProps
 * @property {{ current: number }} progressRef
 * @property {ModelUrls} models
 * @property {TextureUrls} textures
 * @property {boolean} [studio]
 * @property {() => void} [onReady]
 * @property {string} [className]
 * @property {CSSProperties} [style]
 */
```

| Prop          | Required | Description                                                                                                                                                                                                                                        |
| ------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `progressRef` | yes      | A ref holding a number from `0` to `1`. `0` is the start of the animation and `1` is the end. The component reads it every frame, so updating it **never re-renders React**. Any `{ current }` object works: `useRef(0)`, `React.createRef()` or a plain object. |
| `models`      | yes      | `{ phonePe, disk }`: the URLs of the two `.glb` files.                                                                                                                                                                                             |
| `textures`    | yes      | **Exactly 4** image URLs, used as the particle shapes. The shader samples 4 textures, so 3 or 5 won't work.                                                                                                                                        |
| `studio`      | no       | `true` loads the Theatre.js editor on top of the page so you can edit the animation. **Development builds only**: it does nothing in production builds. Defaults to `false`. See section 6.                                                        |
| `onReady`     | no       | Called once, after the models and textures have loaded and the first frame has rendered. Use it to fade the component in or hide a placeholder.                                                                                                     |
| `className`   | no       | Passed to the wrapper `<div>`.                                                                                                                                                                                                                     |
| `style`       | no       | Merged onto the wrapper's style. Defaults to `position: relative; overflow: hidden; width: 100%; height: 100%; touch-action: pan-y`.                                                                                                               |

Changing `models` or `textures` to different URLs rebuilds the scene. Passing new arrays/objects with the **same** URLs on every render does not.

### 3.1 Sizing

The canvas fills its parent (`100%` × `100%`). **The parent must have a real height**, such as `50vh`, `600px` or a flex/grid cell. A parent with `height: auto` collapses to 0 px and nothing shows up.

The logo is framed for a square area. On portrait screens the camera widens its field of view, so the logo always fits the width and never gets cropped. Any aspect ratio works.

### 3.2 Background

The canvas is transparent. Set the background color on the parent element.

### 3.3 Loading placeholder

Nothing shows while the models and textures download. Use `onReady` to swap a placeholder for the canvas:

```jsx
const [ready, setReady] = useState(false);

<div style={{ position: "relative", height: "50vh" }}>
  {!ready && <img src="/assets/logo-static.png" alt="PhonePe" style={{ position: "absolute", inset: 0 }} />}
  <Experience
    progressRef={progressRef}
    models={MODELS}
    textures={TEXTURES}
    onReady={() => setReady(true)}
  />
</div>
```

---

## 4. Driving the animation

The component doesn't care where the progress value comes from. It just maps `progressRef.current` (from `0` to `1`) onto the 10-second Theatre timeline every frame.

### 4.1 Scroll-linked, with GSAP ScrollTrigger (recommended)

The usual setup is a tall section with the canvas pinned (sticky) inside it, so the animation plays as the user scrolls through the section.

```bash
npm install gsap
```

```jsx
import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Experience from "./PhonePeExperience";

gsap.registerPlugin(ScrollTrigger);

export default function LogoSection() {
  const sectionRef = useRef(null);
  const progressRef = useRef(0);

  useEffect(() => {
    // gsap.context collects everything created inside, so revert() cleans it all up
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: "top top",
        end: "bottom bottom",
        scrub: true,
        onUpdate: (self) => {
          progressRef.current = self.progress;
        },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} style={{ height: "300vh" }}>
      <div style={{ position: "sticky", top: 0, height: "100vh" }}>
        <Experience
          progressRef={progressRef}
          models={MODELS}
          textures={TEXTURES}
        />
      </div>
    </section>
  );
}
```

- The section's **height** sets how long the animation lasts. `300vh` means the user scrolls about 2 screens to play it from start to finish.
- `scrub: true` ties progress directly to the scrollbar. Use `scrub: 0.5` for a slightly smoothed, delayed follow.
- `position: sticky` stops working if any ancestor has `overflow: hidden`/`auto` or a `transform`.

#### Custom scroll container

If your page scrolls inside an element instead of the window, pass it as `scroller`:

```js
ScrollTrigger.create({
  trigger: sectionRef.current,
  scroller: document.getElementById("root"),
  start: "top top",
  end: "bottom bottom",
  scrub: true,
  onUpdate: (self) => {
    progressRef.current = self.progress;
  },
});
```

The demo app in this repo works this way. `html, body` have `overflow: hidden` and `#root` is the scroller (see `src/index.css`). This keeps the mobile address bar from collapsing and expanding mid-scroll, which would otherwise resize the canvas and make ScrollTrigger recalculate during the gesture. Use it if you see a jump on mobile. Otherwise normal window scrolling is fine.

### 4.2 Any other source

Anything that writes a number from 0 to 1 into the ref works:

```jsx
<input
  type="range"
  min={0}
  max={1}
  step={0.001}
  onChange={(e) => {
    progressRef.current = Number(e.target.value);
  }}
/>
```

```js
gsap.to(progressRef, { current: 1, duration: 4, ease: "power2.inOut" });
```

---

## 5. Interaction (mouse and touch)

- **Mouse / pen:** particles push away from the cursor and get flicked along its direction of movement. They spring back home when it moves away.
- **Touch:** the wrapper uses `touch-action: pan-y`, so
  - a **vertical** swipe scrolls the page as normal, and the effect stays off for that gesture;
  - a **horizontal** swipe belongs to the canvas, and particles react to the finger.

  All touch listeners are passive, so the component never blocks or delays scrolling.

If you override `style.touchAction`, this behavior changes. Leave it as `pan-y` unless you have a reason.

---

## 6. Editing the animation (Theatre.js)

All keyframes live in `theatre/PhonePe.theatre-project-state.json`. They cover the camera, the transforms, the transitions from disk to scatter to logo, colors, the pulse and the mouse physics settings. Edit them visually:

1. Run your **development** server (`gatsby develop`, `npm run dev`) and render the component with `studio` turned on:

   ```jsx
   <Experience
     studio
     progressRef={progressRef}
     models={MODELS}
     textures={TEXTURES}
   />
   ```

   In this repo's demo, just open the page with `?studio` in the URL.

2. The Theatre editor appears over the page. Select an object in the outline panel and edit its values or keyframes on the timeline.
   - **Camera**: position, `near`, `far` and `zoom`. The camera always looks at the center, and its field of view is computed from the screen shape (`BASE_FOV`), so those aren't editable here.
   - **Pattern / Transformations**: position, rotation and scale of the whole particle group.
   - **Pattern / Transitions Controls**: `aligned_to_random` (neat grid on a disk to scattered disk), `random_to_phonePe` (disk to logo), `base_scale`, `color_transition`, `pulse_amount`, `distance_factor`, and the `mouse_factor` physics settings (`radius`, `strength`, `stiffness`, `damping`, `drag`, `fade_speed`).
   - **RayCast Plane / Transformations**: the invisible plane that detects the pointer. Keep it under the particles.
3. While studio is on, scroll still drives the playhead. To scrub freely with the timeline instead, temporarily stop updating `progressRef`.
4. When you're done, click the project name **PhonePe** in the outline panel, then **Export PhonePe to JSON**.
5. Replace `theatre/PhonePe.theatre-project-state.json` with the exported file.
6. Remove the `studio` prop and reload.

Notes:

- The editor has panels and a timeline, but **no 3D viewport or drag handles**. That part came from `@theatre/r3f`, which doesn't support React 16. Edit values by typing, dragging the numbers, or keyframing.
- Studio is gated by `process.env.NODE_ENV === 'development'`. Production builds (`gatsby build`) drop it entirely, even if `studio` is left `true` by mistake.
- Theatre also saves your edits in the browser's localStorage. If the page doesn't match the JSON file after you replace it, clear the site's local storage.
- The browser console shows a CORS error for `updates.theatrejs.com` while studio is open. That's Studio's update check and is harmless.

The timeline is **10 seconds** long, and progress `0 → 1` maps to `0s → 10s`. If you make the sequence longer or shorter in the studio, update `SEQUENCE_LENGTH` in `createExperience.js` to match.

---

## 7. Tuning constants

These are deliberately not exposed as props, so the designed look can't drift by accident. To change one, edit it in the source:

| Constant             | File                  | Default        | Effect                                                                                                        |
| -------------------- | --------------------- | -------------- | ------------------------------------------------------------------------------------------------------------- |
| `TOTAL_POINTS`       | `PhonePeLogo.js`      | `7000`         | Number of particles. Lower it for weaker devices. More points means a slower first load and lower frame rate. |
| `PALETTE`            | `PhonePeLogo.js`      | 7 brand colors | Particle colors. The first 3 are also the base colors used when `color_transition` is `1`.                    |
| `POINTER_SMOOTHING`  | `PhonePeLogo.js`      | `30`           | How closely the effect follows the pointer. Higher is snappier, lower is smoother.                            |
| `BASE_FOV`           | `createExperience.js` | `42`           | Camera field of view on landscape and square screens.                                                         |
| `DESIGN_ASPECT`      | `createExperience.js` | `1`            | The aspect ratio below which the camera starts widening to keep the logo in frame.                            |
| `SEQUENCE_LENGTH`    | `createExperience.js` | `10`           | Theatre timeline length in seconds. It must match the sequence.                                               |
| `MAX_PIXEL_RATIO`    | `createExperience.js` | `2`            | Upper limit for the device pixel ratio. Lower it to `1.5` for better performance on high-density phones.      |

### 7.1 Replacing the models or shapes

- **Models:** the PhonePe `.glb` must contain a mesh named **`Mid_polly`** (`Mid polly` in Blender) and the disk `.glb` one named **`Disk`**. Both must be closed (watertight) meshes, because particles are placed by testing whether a point is _inside_ the mesh.
- **Export them uncompressed.** No decoder is set up, so a Draco- or Meshopt-compressed `.glb` fails to load. In Blender's glTF exporter, leave **Compression** unchecked. Uncompressed, the two current models are 92 KB together (about 26 KB gzipped).
- **Shapes:** any 4 images. Pixels with alpha below `0.9` are cut out, so use PNG or WebP with transparency for non-square shapes.

---

## 8. Performance

- Particles render in **one draw call** (instanced geometry with a custom shader).
- On mount, points are sampled inside both meshes, sped up with `three-mesh-bvh`. This runs once on the main thread and takes a short moment on low-end phones.
- Pointer physics runs on the CPU for every particle, every frame. If you lower `TOTAL_POINTS`, this gets cheaper too.
- The render loop **pauses while the canvas is off-screen** (`IntersectionObserver`) and while the browser tab is hidden.
- Unmounting releases everything: the render loop, listeners, GPU buffers, textures and the WebGL context.

---

## 9. Server rendering, Gatsby and tests

- **Server rendering (Gatsby build, SSR):** safe. On the server the component renders an empty `<div>`. `three`, `three-mesh-bvh` and `@theatre/core` can all be imported in Node, and all WebGL and DOM work happens inside `useEffect`, which only runs in the browser. No `gatsby-node.js` changes or `loadable` wrappers are needed.
- **No WebGL** (old devices, disabled GPU): the component logs a warning and renders nothing, instead of throwing. Put a static logo image behind it as a fallback.
- **Jest / jsdom:** there's no WebGL in jsdom, so creating the renderer fails and the component should render nothing, as above. This hasn't been tested in a real Jest setup yet. Jest doesn't transform `node_modules` by default, and `three/examples/jsm/...` is an ES module, so you may need one of these in your Jest config:

  ```js
  // Option A: transform three.js's ES modules
  transformIgnorePatterns: ["node_modules/(?!(three|three-mesh-bvh)/)"],

  // Option B: replace the component with a stub in tests
  moduleNameMapper: { "PhonePeExperience$": "<rootDir>/__mocks__/PhonePeExperience.js" },
  ```

---

## 10. Limitations

- **One instance per page.** The Theatre project and sheet are module-level singletons, so two `<Experience />`s at the same time would share and fight over one timeline.
- **Exactly 4 shape textures** (see Props).

---

## 11. Troubleshooting

| Symptom                                                         | Likely cause                                                                                                    |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Nothing visible, no errors                                      | The parent has no height. Give it an explicit height.                                                           |
| 404s for `.glb`/`.webp`, only on some routes                    | You used relative asset URLs. Use `/assets/...`.                                                                |
| `Could not load ... .glb` / CORS error                          | The assets are on another origin without CORS headers.                                                          |
| `No DRACOLoader instance provided`                              | A model was exported with Draco compression. Re-export it uncompressed (see 7.1).                               |
| `... must contain a mesh named "Mid_polly"` / `"Disk"`          | The model doesn't contain that mesh. See 7.1.                                                                   |
| The animation doesn't move on scroll                            | `progressRef.current` isn't being updated. Check that the ScrollTrigger `trigger`/`scroller` match your layout. |
| The animation jumps on mobile as the address bar hides          | Use the custom scroller setup in section 4.1.                                                                   |
| `Cannot use import statement outside a module` in Jest          | Jest isn't transforming three.js. See section 9.                                                                |
| `React is not defined`                                          | A file is missing `import React from 'react'` (needed by the classic JSX runtime).                              |
| The page doesn't match the new JSON after editing               | Theatre's localStorage copy is overriding it. Clear site storage.                                               |
