# PhonePe Experience

A drop-in React component that renders the animated 3D particle PhonePe logo.

About 7,000 small shapes start as a flat disk, scatter, and then fly together into the PhonePe logo. Pointer and touch input pushes them around.

You choose how the animation advances. You pass a number from `0` to `1` (usually scroll progress), and the component plays the matching point of the timeline.

---

## 1. Quick start

```tsx
import { useRef } from "react";
import Experience, {
  type ModelUrls,
  type TextureUrls,
} from "./PhonePeExperience";

const MODELS: ModelUrls = {
  phonePe: "/assets/models/MidPolyPhonepe.glb",
  disk: "/assets/models/MidPolyDisk.glb",
};

const TEXTURES: TextureUrls = [
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

|         |                                                                                                  |
| ------- | ------------------------------------------------------------------------------------------------ |
| React   | **19+** (required by `@react-three/fiber` v9)                                                    |
| Browser | WebGL 2                                                                                          |
| Bundler | Any that can import `.ts`/`.tsx` and `.json`, such as Vite, Next.js, webpack 5, Rspack or Parcel |

The component doesn't use any bundler-specific features. There are no `?raw` imports, no `import.meta.env`, and no special loaders.

### 2.2 Install dependencies

```bash
npm install three @react-three/fiber @react-three/drei @theatre/core @theatre/r3f @theatre/studio three-mesh-bvh
npm install -D @types/three
```

These are the versions it was built and tested with:

| Package                                            | Version |
| -------------------------------------------------- | ------- |
| `three`                                            | 0.186   |
| `@react-three/fiber`                               | 9.8     |
| `@react-three/drei`                                | 10.7    |
| `@theatre/core`, `@theatre/r3f`, `@theatre/studio` | 0.7.2   |
| `three-mesh-bvh`                                   | 0.9     |

Keep `@theatre/studio` installed even if you never turn the studio on. The component imports it lazily, so bundlers still need to resolve it, but it only downloads when `studio` is `true`.

`gsap` is **not** a dependency of the component. You only need it if you use the scroll recipe in section 4.

### 2.3 Copy the files

1. Copy the whole `PhonePeExperience/` folder anywhere in your source tree.
2. Copy the assets into your static/public folder. They must be reachable by URL:

```
public/
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

> **Use absolute URLs** (`/assets/...` or `https://...`). A relative URL like `assets/...` resolves against the current page, so it breaks on nested routes such as `/offers/summer`.

### 2.4 Folder contents

```
PhonePeExperience/
  index.ts                 Public exports
  Experience.tsx           The component: Canvas, camera, timeline
  PhonePeLogo.tsx          Particles: geometry, material, mouse physics
  helpers/
    meshToPoints.ts        Samples points inside the GLB meshes
    useMouse.ts            Mouse and touch tracking that doesn't block scrolling
  shaders/
    plane.vert.ts          Vertex shader (GLSL as a TS string)
    plane.frag.ts          Fragment shader (GLSL as a TS string)
  theatre/
    init.ts                Theatre project, sheet and studio loader
    PhonePe.theatre-project-state.json   The animation
```

Import only from `index.ts`. Treat everything else as internal.

---

## 3. Props

```ts
type ExperienceProps = {
  progressRef: RefObject<number>;
  models: ModelUrls;
  textures: TextureUrls;
  studio?: boolean;
  className?: string;
  style?: CSSProperties;
};
```

| Prop          | Required | Description                                                                                                                                                                        |
| ------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `progressRef` | yes      | A React ref holding a number from `0` to `1`. `0` is the start of the animation and `1` is the end. The component reads it every frame, so updating it **never re-renders React**. |
| `models`      | yes      | `{ phonePe, disk }`: the URLs of the two `.glb` files.                                                                                                                             |
| `textures`    | yes      | **Exactly 4** image URLs, used as the particle shapes. The shader samples 4 textures, so 3 or 5 won't work.                                                                        |
| `studio`      | no       | `true` loads the Theatre.js editor on top of the page so you can edit the animation. Defaults to `false`. **Never ship it as `true`.** See section 7.                              |
| `className`   | no       | Passed to the canvas wrapper.                                                                                                                                                      |
| `style`       | no       | Merged onto the canvas wrapper's style. Defaults to `width: 100%; height: 100%; touch-action: pan-y`.                                                                              |

### 3.1 Sizing

The canvas fills its parent (`100%` × `100%`). **The parent must have a real height**, such as `50vh`, `600px` or a flex/grid cell. A parent with `height: auto` collapses to 0 px and nothing shows up.

The logo is framed for a square area. On portrait screens the camera widens its field of view, so the logo always fits the width and never gets cropped. Any aspect ratio works.

### 3.2 Background

The canvas is transparent. Set the background color on the parent element.

---

## 4. Driving the animation

The component doesn't care where the progress value comes from. It just maps `progressRef.current` (from `0` to `1`) onto the 10-second Theatre timeline every frame.

### 4.1 Scroll-linked, with GSAP ScrollTrigger (recommended)

The usual setup is a tall section with the canvas pinned (sticky) inside it, so the animation plays as the user scrolls through the section.

```bash
npm install gsap @gsap/react
```

```tsx
import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import Experience from "./PhonePeExperience";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export default function LogoSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);

  useGSAP(
    () => {
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: "top top",
        end: "bottom bottom",
        scrub: true,
        onUpdate: (self) => {
          progressRef.current = self.progress;
        },
      });
    },
    { scope: sectionRef },
  );

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

#### Custom scroll container

If your page scrolls inside an element instead of the window, pass it as `scroller`:

```ts
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

```tsx
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

```ts
gsap.to(progressRef, { current: 1, duration: 4, ease: "power2.inOut" });
```

---

## 5. Interaction (mouse and touch)

- **Mouse / pen:** particles push away from the cursor and get flicked along its direction of movement. They spring back home when it moves away.
- **Touch:** the canvas uses `touch-action: pan-y`, so
  - a **vertical** swipe scrolls the page as normal, and the effect stays off for that gesture;
  - a **horizontal** swipe belongs to the canvas, and particles react to the finger.

  All touch listeners are passive, so the component never blocks or delays scrolling.

If you override `style.touchAction`, this behavior changes. Leave it as `pan-y` unless you have a reason.

---

## 6. Editing the animation (Theatre.js)

All keyframes live in `theatre/PhonePe.theatre-project-state.json`. They cover the camera, the transforms, the transitions from disk to scatter to logo, colors, the pulse and the mouse physics settings. Edit them visually:

1. Render the component with `studio` turned on, **locally only**:

   ```tsx
   <Experience
     studio
     progressRef={progressRef}
     models={MODELS}
     textures={TEXTURES}
   />
   ```

2. The Theatre editor appears over the page. Select an object in the outline panel and edit its values or keyframes on the timeline.
   - **Camera**: the camera position and rotation.
   - **Pattern / Transformations**: position, rotation and scale of the whole particle group.
   - **Pattern / Transitions Controls**: `aligned_to_random` (neat grid on a disk to scattered disk), `random_to_phonePe` (disk to logo), `base_scale`, `color_transition`, `pulse_amount`, `distance_factor`, and the `mouse_factor` physics settings (`radius`, `strength`, `stiffness`, `damping`, `drag`, `fade_speed`).
   - **RayCast Plane / Transformations**: the invisible plane that detects the pointer. Keep it under the particles.
3. While studio is on, scroll still drives the playhead. To scrub freely with the timeline instead, temporarily stop updating `progressRef`.
4. When you're done, click the project name **PhonePe** in the outline panel, then **Export PhonePe to JSON**.
5. Replace `theatre/PhonePe.theatre-project-state.json` with the exported file.
6. Remove the `studio` prop and reload.

> Theatre also saves your edits in the browser's localStorage. If the page doesn't match the JSON file after you replace it, clear the site's local storage.

The timeline is **10 seconds** long, and progress `0 → 1` maps to `0s → 10s`. If you make the sequence longer or shorter in the studio, update `SEQUENCE_LENGTH` in `Experience.tsx` to match.

---

## 7. Tuning constants

These are deliberately not exposed as props, so the designed look can't drift by accident. To change one, edit it in the source:

| Constant            | File              | Default        | Effect                                                                                                        |
| ------------------- | ----------------- | -------------- | ------------------------------------------------------------------------------------------------------------- |
| `TOTAL_POINTS`      | `PhonePeLogo.tsx` | `7000`         | Number of particles. Lower it for weaker devices. More points means a slower first load and lower frame rate. |
| `PALETTE`           | `PhonePeLogo.tsx` | 7 brand colors | Particle colors. The first 3 are also the base colors used when `color_transition` is `1`.                    |
| `POINTER_SMOOTHING` | `PhonePeLogo.tsx` | `30`           | How closely the effect follows the pointer. Higher is snappier, lower is smoother.                            |
| `BASE_FOV`          | `Experience.tsx`  | `42`           | Camera field of view on landscape and square screens.                                                         |
| `DESIGN_ASPECT`     | `Experience.tsx`  | `1`            | The aspect ratio below which the camera starts widening to keep the logo in frame.                            |
| `SEQUENCE_LENGTH`   | `Experience.tsx`  | `10`           | Theatre timeline length in seconds. It must match the sequence.                                               |

### 7.1 Replacing the models or shapes

- **Models:** the PhonePe `.glb` must contain a mesh named **`Mid_polly`** and the disk `.glb` one named **`Disk`**. Both must be closed (watertight) meshes, because particles are placed by testing whether a point is _inside_ the mesh.
- **Shapes:** any 4 images. Pixels with alpha below `0.9` are cut out, so use PNG or WebP with transparency for non-square shapes.

---

## 8. Performance

- Particles render in **one draw call** (instanced geometry with a custom shader).
- On mount, points are sampled inside both meshes, sped up with `three-mesh-bvh`. This runs once on the main thread and takes a short moment on low-end phones.
- Pointer physics runs on the CPU for every particle, every frame. If you lower `TOTAL_POINTS`, this gets cheaper too.
- The canvas renders continuously while it's mounted. If it sits far down a long page, consider mounting it only when it's near the viewport, for example with an `IntersectionObserver`.

---

## 9. Limitations

- **One instance per page.** The Theatre project and sheet are module-level singletons, so two `<Experience />`s at the same time would share and fight over one timeline.
- **No WebGL fallback.** If WebGL isn't available, nothing renders. Wrap the component in an error boundary and show a static logo image as the fallback.
- **Nothing shows while loading.** The canvas stays empty while the models and textures download. Put a static logo or placeholder behind it if needed.
- **Exactly 4 shape textures** (see Props).

---

## 10. Troubleshooting

| Symptom                                                    | Likely cause                                                                                                    |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Nothing visible, no errors                                 | The parent has no height. Give it an explicit height.                                                           |
| 404s for `.glb`/`.webp`, only on some routes               | You used relative asset URLs. Use `/assets/...`.                                                                |
| `Could not load ... .glb` / CORS error                     | The assets are on another origin without CORS headers.                                                          |
| `Cannot read properties of undefined (reading 'geometry')` | The model doesn't contain a mesh named `Mid_polly` / `Disk`.                                                    |
| The animation doesn't move on scroll                       | `progressRef.current` isn't being updated. Check that the ScrollTrigger `trigger`/`scroller` match your layout. |
| The animation jumps on mobile as the address bar hides     | Use the custom scroller setup in section 4.1.                                                                   |
| `window is not defined` in Next.js                         | Load the component with `dynamic(..., { ssr: false })`.                                                         |
| The page doesn't match the new JSON after editing          | Theatre's localStorage copy is overriding it. Clear site storage.                                               |
