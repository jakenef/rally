import * as THREE from "three";
import type { Court, Profile } from "@rally/types";
export type FacilityController = {
  setCourts(courts: Court[]): void;
  dispose(): void;
};
type View = "facility" | "court" | "player";

/** Owns the WebGL scene and overlay nodes inside React's empty host. */
export function mountFacility(
  container: HTMLElement,
  players: Profile[],
  initialCourts: Court[],
): FacilityController {
  let level: View = "facility",
    courtIndex = 0,
    playerIndex = 0,
    hoverCourt: number | null = null,
    hoverPlayer: number | null = null;
  const profiles = new Map(players.map((p) => [p.playerId, p]));
  let assignments = initialCourts;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const escape = (s: string | number) =>
    String(s).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c]!,
    );
  let pickleGeometry:
    | {
        outer: THREE.SphereGeometry;
        inner: THREE.SphereGeometry;
        walls: THREE.BufferGeometry;
        texture: THREE.CanvasTexture;
      }
    | undefined;
  function buildPickleGeometry() {
    if (pickleGeometry) return pickleGeometry;
    const holes = [];
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < 40; i++) {
      const y = 1 - (2 * (i + 0.5)) / 40,
        r = Math.sqrt(1 - y * y),
        angle = i * golden;
      holes.push(
        new THREE.Vector3(Math.cos(angle) * r, y, Math.sin(angle) * r),
      );
    }
    const radius = 0.85,
      innerRadius = 0.785,
      holeAngle = 0.135;
    const outer = new THREE.SphereGeometry(radius, 224, 144);
    const position = outer.attributes.position,
      index = outer.index!.array,
      kept = [];
    const center = new THREE.Vector3(),
      a = new THREE.Vector3(),
      b = new THREE.Vector3(),
      c = new THREE.Vector3();
    for (let i = 0; i < index.length; i += 3) {
      a.fromBufferAttribute(position, index[i]);
      b.fromBufferAttribute(position, index[i + 1]);
      c.fromBufferAttribute(position, index[i + 2]);
      center.copy(a).add(b).add(c).normalize();
      if (!holes.some((h) => h.dot(center) > Math.cos(holeAngle)))
        kept.push(index[i], index[i + 1], index[i + 2]);
    }
    outer.setIndex(kept);
    const inner = outer.clone();
    inner.scale(
      innerRadius / radius,
      innerRadius / radius,
      innerRadius / radius,
    );
    const reversed = [];
    for (let i = 0; i < kept.length; i += 3)
      reversed.push(kept[i], kept[i + 2], kept[i + 1]);
    inner.setIndex(reversed);
    inner.computeVertexNormals();
    const wallPositions: number[] = [],
      wallIndices: number[] = [];
    holes.forEach((normal) => {
      const u = new THREE.Vector3()
        .crossVectors(
          normal,
          Math.abs(normal.y) > 0.9
            ? new THREE.Vector3(1, 0, 0)
            : new THREE.Vector3(0, 1, 0),
        )
        .normalize();
      const v = new THREE.Vector3().crossVectors(normal, u).normalize();
      const start = wallPositions.length / 3;
      for (let j = 0; j <= 32; j++) {
        const angle = (j / 32) * Math.PI * 2;
        const direction = normal
          .clone()
          .multiplyScalar(Math.cos(holeAngle))
          .addScaledVector(u, Math.sin(holeAngle) * Math.cos(angle))
          .addScaledVector(v, Math.sin(holeAngle) * Math.sin(angle));
        for (const r of [radius, innerRadius])
          wallPositions.push(direction.x * r, direction.y * r, direction.z * r);
        if (j < 32) {
          const k = start + j * 2;
          wallIndices.push(k, k + 1, k + 2, k + 2, k + 1, k + 3);
        }
      }
    });
    const walls = new THREE.BufferGeometry();
    walls.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(wallPositions, 3),
    );
    walls.setIndex(wallIndices);
    walls.computeVertexNormals();
    const cv = document.createElement("canvas");
    cv.width = 128;
    cv.height = 128;
    const ctx = cv.getContext("2d")!,
      pixels = ctx.createImageData(128, 128);
    let n = 17;
    for (let i = 0; i < pixels.data.length; i += 4) {
      n = (n * 1664525 + 1013904223) >>> 0;
      const g = 120 + (n % 25);
      pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = g;
      pixels.data[i + 3] = 255;
    }
    ctx.putImageData(pixels, 0, 0);
    const texture = new THREE.CanvasTexture(cv);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(5, 3);
    pickleGeometry = { outer, inner, walls, texture };
    return pickleGeometry;
  }
  container.innerHTML = `<div class="facility-view"><div class="facility-topline"><span class="eyebrow">Facility overview / 4 courts</span><span class="eyebrow">Hover a court. Select to enter.</span></div><div class="facility-stage"><div class="facility-labels"></div><div class="focus-chrome" hidden><button class="ch-btn ch-btn-outline view-back" type="button">Back to facility</button><div class="focus-court-title"></div></div><section class="signature-profile" aria-label="Player profile" hidden></section><div class="player-switch" hidden><button type="button" class="ch-btn ch-btn-outline previous">Previous</button><span class="selected-name"></span><button type="button" class="ch-btn ch-btn-outline next">Next</button></div><div class="facility-loading" role="status">Preparing the facility.</div></div></div>`;
  const stage = container.querySelector<HTMLElement>(".facility-stage")!,
    labels = container.querySelector<HTMLElement>(".facility-labels")!,
    chrome = container.querySelector<HTMLElement>(".focus-chrome")!,
    profile = container.querySelector<HTMLElement>(".signature-profile")!,
    switcher = container.querySelector<HTMLElement>(".player-switch")!,
    back = container.querySelector<HTMLElement>(".view-back")!,
    title = container.querySelector<HTMLElement>(".focus-court-title")!;
  let scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer | undefined;
  let groups: {
    root: THREE.Group;
    outline: THREE.LineLoop<THREE.BufferGeometry, THREE.LineBasicMaterial>;
    base: THREE.Mesh;
    lift: number;
  }[] = [];
  let figures: {
    group: THREE.Group;
    ring: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>;
    glow: THREE.Sprite;
    material: THREE.MeshStandardMaterial;
    c: number;
    pIndex: number;
    lift: number;
  }[] = [];
  let courtButtons: HTMLButtonElement[] = [];
  let playerButtons: {
    label: HTMLButtonElement;
    c: number;
    pIndex: number;
    figure: (typeof figures)[number];
  }[] = [];
  let lastTime = 0,
    lastFocus: HTMLElement | undefined,
    animation = 0,
    disposed = false;
  const observers: ResizeObserver[] = [];
  const origins = [
    [-12.5, -7.4],
    [12.5, -7.4],
    [-12.5, 7.4],
    [12.5, 7.4],
  ];
  const playerPositions = [
    [-5.5, -2.5],
    [-5.5, 2.5],
    [5.5, -2.5],
    [5.5, 2.5],
  ];
  function setView(next: View, c = courtIndex, p = playerIndex) {
    if (level === "facility" && next !== "facility")
      lastFocus =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : undefined;
    level = next;
    courtIndex = c;
    playerIndex = p;
    hoverCourt = null;
    hoverPlayer = null;
    const focused = level !== "facility";
    document.documentElement.style.setProperty(
      "--facility-nav-height",
      document.querySelector<HTMLElement>(".rl-nav")!.getBoundingClientRect()
        .height + "px",
    );
    stage.classList.toggle("facility-focused", focused);
    document.body.classList.toggle("facility-focus-open", focused);
    chrome.hidden = !focused;
    profile.hidden = level !== "player";
    switcher.hidden = level !== "player";
    back.textContent =
      level === "player" ? "Back to court" : "Back to facility";
    if (focused) {
      stage.setAttribute("role", "dialog");
      stage.setAttribute("aria-modal", "true");
      stage.setAttribute(
        "aria-label",
        level === "player" ? "Player spotlight" : `Court ${c + 1}`,
      );
      back.focus({ preventScroll: true });
    } else {
      stage.removeAttribute("role");
      stage.removeAttribute("aria-modal");
      stage.removeAttribute("aria-label");
      lastFocus?.focus({ preventScroll: true });
    }
    title.innerHTML =
      level === "court"
        ? `<span class="eyebrow">Doubles</span><h2 class="ch-hl ch-hl-h3">Court ${c + 1}</h2><span class="court-focus-score">Fairness ${assignments[c].fairness.toFixed(0)} / 100</span>`
        : "";
    if (level === "player") renderProfile();
    resize();
    updateLabels();
  }
  function renderProfile() {
    const p = profiles.get(assignments[courtIndex].teams.flat()[playerIndex])!;
    const jersey = `${playerIndex < 2 ? "A" : "B"}${(playerIndex % 2) + 1}`;
    profile.innerHTML = `<div class="eyebrow">Court ${courtIndex + 1} / Team ${playerIndex < 2 ? "A · crimson" : "B · paper"}</div><h2 class="ch-hl ch-hl-h2">${escape(p.name)}</h2><div class="signature-meta">${jersey} · Skill ${p.skill.mu.toFixed(1)} · ${escape(p.tempo)} tempo</div><div class="signature-stats">${(
      [
        ["Power", p.style.power],
        ["Kitchen tendency", p.style.kitchen],
        ["Mobility", p.style.mobility],
        ["Readiness", p.style.readiness],
      ] as [string, number][]
    )
      .map(
        ([name, v]) =>
          `<div class="signature-stat"><div><span>${name}</span><strong>${Math.round(v * 100)}</strong></div><div class="track"><div class="fill" style="width:${v * 100}%"></div></div></div>`,
      )
      .join(
        "",
      )}</div>`;
    switcher.querySelector<HTMLElement>(".selected-name")!.textContent =
      `${p.name} (${jersey})`;
  }
  back.addEventListener("click", () =>
    setView(level === "player" ? "court" : "facility"),
  );
  switcher
    .querySelector<HTMLElement>(".previous")!
    .addEventListener("click", () =>
      setView("player", courtIndex, (playerIndex + 3) % 4),
    );
  switcher
    .querySelector<HTMLElement>(".next")!
    .addEventListener("click", () =>
      setView("player", courtIndex, (playerIndex + 1) % 4),
    );
  stage.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && level !== "facility") {
      e.preventDefault();
      setView(level === "player" ? "court" : "facility");
    }
    if (e.key === "Tab" && level !== "facility") {
      const focusables = [
        ...stage.querySelectorAll<HTMLButtonElement>("button"),
      ].filter(
        (b) =>
          !b.hidden &&
          !b.closest("[hidden]") &&
          getComputedStyle(b).display !== "none",
      );
      const idx = focusables.indexOf(
        document.activeElement as HTMLButtonElement,
      );
      if (e.shiftKey && idx <= 0) {
        e.preventDefault();
        focusables.at(-1)?.focus();
      } else if (!e.shiftKey && idx === focusables.length - 1) {
        e.preventDefault();
        focusables[0]?.focus();
      }
    }
  });
  function rebuildPlayers() {
    if (!renderer) return;
    figures.forEach((f) => {
      f.group.parent?.remove(f.group);
      f.ring.parent?.remove(f.ring);
      f.group.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.Sprite) {
          if (o instanceof THREE.Mesh || o instanceof THREE.Sprite) {
            const materials = Array.isArray(o.material)
              ? o.material
              : [o.material];
            materials.forEach((m) => {
              if (
                m instanceof THREE.MeshStandardMaterial ||
                m instanceof THREE.SpriteMaterial
              )
                m.map?.dispose();
              m.dispose();
            });
          }
        }
      });
      f.ring.geometry.dispose();
      f.ring.material.dispose();
    });
    figures = [];
    labels.replaceChildren();
    courtButtons = [];
    playerButtons = [];
    assignments.forEach((court, c) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "facility-court-hit";
      button.setAttribute(
        "aria-label",
        `Enter Court ${c + 1}, fairness ${court.fairness.toFixed(0)}`,
      );
      button.innerHTML = `<span class="facility-court-tag"><span>Court ${c + 1}</span><span>Fairness ${court.fairness.toFixed(0)}</span></span>`;
      button.addEventListener("pointerenter", () => (hoverCourt = c));
      button.addEventListener("pointerleave", () => (hoverCourt = null));
      button.addEventListener("focus", () => (hoverCourt = c));
      button.addEventListener("blur", () => (hoverCourt = null));
      button.addEventListener("click", () => setView("court", c));
      labels.append(button);
      courtButtons.push(button);
      court.teams.flat().forEach((id, pIndex) => {
        const p = profiles.get(id)!,
          isA = pIndex < 2,
          [x, z] = playerPositions[pIndex];
        const group = new THREE.Group();
        group.position.set(x, 1.35, z);
        group.rotation.set(0.3, pIndex * 0.6, 0.2);
        groups[c].root.add(group);
        const geometry = buildPickleGeometry();
        const m = new THREE.MeshStandardMaterial({
          color: token(isA ? "--crimson" : "--paper"),
          roughness: 0.48,
          metalness: 0,
          bumpMap: geometry.texture,
          bumpScale: 0.012,
          emissive: new THREE.Color(
            isA ? token("--crimson") : token("--paper"),
          ),
          emissiveIntensity: 0,
        });
        group.add(new THREE.Mesh(geometry.outer, m));
        group.add(
          new THREE.Mesh(
            geometry.inner,
            new THREE.MeshStandardMaterial({
              color: token(isA ? "--crimson-deep" : "--night-ink-faint"),
              roughness: 0.7,
            }),
          ),
        );
        group.add(
          new THREE.Mesh(
            geometry.walls,
            new THREE.MeshStandardMaterial({
              color: token(isA ? "--crimson" : "--paper"),
              roughness: 0.5,
              side: THREE.DoubleSide,
            }),
          ),
        );
        const glowCanvas = document.createElement("canvas");
        glowCanvas.width = 128;
        glowCanvas.height = 128;
        const ctx = glowCanvas.getContext("2d")!,
          g = ctx.createRadialGradient(64, 64, 5, 64, 64, 64),
          hue = "#" + new THREE.Color(token(isA ? "--crimson" : "--paper")).getHexString();
        g.addColorStop(0, hue);
        g.addColorStop(0.45, hue + "66");
        g.addColorStop(1, hue + "00");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 128, 128);
        const glow = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: new THREE.CanvasTexture(glowCanvas),
            opacity: 0,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
          }),
        );
        glow.scale.set(3.1, 3.1, 1);
        group.add(glow);
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(0.94, 0.025, 8, 64),
          new THREE.MeshBasicMaterial({ color: token("--crimson-text") }),
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(x, 0.07, z);
        ring.visible = false;
        groups[c].root.add(ring);
        figures.push({ group, ring, glow, material: m, c, pIndex, lift: 0 });
        const label = document.createElement("button");
        label.type = "button";
        label.className = "facility-player-hit";
        label.setAttribute("aria-label", `Inspect ${p.name}`);
        label.innerHTML = `<span class="player-target"></span><span class="facility-player-name">${escape(p.name)}</span>`;
        label.addEventListener("pointerenter", () => (hoverPlayer = pIndex));
        label.addEventListener("pointerleave", () => (hoverPlayer = null));
        label.addEventListener("focus", () => (hoverPlayer = pIndex));
        label.addEventListener("blur", () => (hoverPlayer = null));
        label.addEventListener("click", () => setView("player", c, pIndex));
        labels.append(label);
        playerButtons.push({ label, c, pIndex, figure: figures.at(-1)! });
      });
    });
    updateLabels();
  }
  function token(name: string) {
    return getComputedStyle(document.body).getPropertyValue(name).trim();
  }
  function resize() {
    if (!renderer) return;
    const nav = document
      .querySelector<HTMLElement>(".rl-nav")!
      .getBoundingClientRect().height;
    document.documentElement.style.setProperty(
      "--facility-nav-height",
      nav + "px",
    );
    renderer.setSize(stage.clientWidth, stage.clientHeight, false);
    camera.aspect = stage.clientWidth / stage.clientHeight;
    camera.updateProjectionMatrix();
  }
  function project(v: THREE.Vector3) {
    const point = v.clone().project(camera);
    return {
      x: ((point.x + 1) / 2) * stage.clientWidth,
      y: ((1 - point.y) / 2) * stage.clientHeight,
    };
  }
  function updateLabels() {
    if (!renderer) return;
    courtButtons.forEach((button, i) => {
      button.hidden = level !== "facility";
      if (button.hidden) return;
      const [x, z] = origins[i];
      const corners = [
        [-11, -5.7],
        [11, -5.7],
        [-11, 5.7],
        [11, 5.7],
      ].map(([dx, dz]) => project(new THREE.Vector3(x + dx, 0.2, z + dz)));
      const left = Math.min(...corners.map((p) => p.x)),
        right = Math.max(...corners.map((p) => p.x)),
        top = Math.min(...corners.map((p) => p.y)),
        bottom = Math.max(...corners.map((p) => p.y));
      Object.assign(button.style, {
        left: Math.round(left) + "px",
        top: Math.round(top) + "px",
        width: Math.round(right - left) + "px",
        height: Math.round(bottom - top) + "px",
      });
    });
    playerButtons.forEach(({ label, c, figure }) => {
      label.hidden = level !== "court" || c !== courtIndex;
      if (label.hidden) return;
      const [ox, oz] = origins[c];
      const p = project(
        new THREE.Vector3(
          ox + figure.group.position.x,
          0.05,
          oz + figure.group.position.z,
        ),
      );
      label.style.left = Math.round(p.x) + "px";
      label.style.top = Math.round(p.y + 20) + "px";
    });
  }
  if (THREE) {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(42, 1, 0.1, 250);
    camera.position.set(0, 40, 34);
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    } catch (error) {
      console.warn(error);
    }
    if (renderer) {
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
      renderer.setClearColor(0, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.domElement.setAttribute("aria-hidden", "true");
      stage.prepend(renderer.domElement);
      scene.add(
        new THREE.HemisphereLight(token("--paper"), token("--night"), 2.2),
      );
      const sun = new THREE.DirectionalLight(token("--paper"), 3);
      sun.position.set(-15, 30, 12);
      scene.add(sun);
      const mat = (
        name: string,
        extra: THREE.MeshStandardMaterialParameters = {},
      ) =>
        new THREE.MeshStandardMaterial({
          color: token(name),
          roughness: 0.48,
          ...extra,
        });
      origins.forEach(([ox, oz], i) => {
        const root = new THREE.Group();
        root.position.set(ox, 0, oz);
        scene.add(root);
        const add = (
          geo: THREE.BufferGeometry,
          m: THREE.Material,
          x: number,
          y: number,
          z: number,
        ) => {
          const object = new THREE.Mesh(geo, m);
          object.position.set(x, y, z);
          root.add(object);
          return object;
        };
        const base = add(
          new THREE.BoxGeometry(22, 0.55, 11),
          mat("--night-raised"),
          0,
          -0.4,
          0,
        );
        add(
          new THREE.BoxGeometry(20, 0.07, 9.09),
          mat("--crimson-deep"),
          0,
          -0.08,
          0,
        );
        add(
          new THREE.BoxGeometry(6.36, 0.08, 9.09),
          mat("--crimson"),
          0,
          -0.03,
          0,
        );
        const stripe = mat("--paper");
        const line = (x: number, z: number, w: number, d: number) =>
          add(new THREE.BoxGeometry(w, 0.025, d), stripe, x, 0.03, z);
        line(-10, 0, 0.06, 9.09);
        line(10, 0, 0.06, 9.09);
        line(0, -4.545, 20, 0.06);
        line(0, 4.545, 20, 0.06);
        line(-3.18, 0, 0.06, 9.09);
        line(3.18, 0, 0.06, 9.09);
        line(-6.59, 0, 6.82, 0.06);
        line(6.59, 0, 6.82, 0.06);
        const points = [];
        for (let z = -4.8; z <= 4.8; z += 0.22)
          points.push(
            new THREE.Vector3(0, 0.05, z),
            new THREE.Vector3(0, 1.35, z),
          );
        for (let y = 0.05; y <= 1.35; y += 0.16)
          points.push(
            new THREE.Vector3(0, y, -4.8),
            new THREE.Vector3(0, y, 4.8),
          );
        root.add(
          new THREE.LineSegments(
            new THREE.BufferGeometry().setFromPoints(points),
            new THREE.LineBasicMaterial({
              color: token("--night-ink-faint"),
              transparent: true,
              opacity: 0.65,
            }),
          ),
        );
        add(new THREE.BoxGeometry(0.06, 0.06, 9.8), stripe, 0, 1.4, 0);
        for (const z of [-4.85, 4.85])
          add(
            new THREE.CylinderGeometry(0.09, 0.12, 1.65, 16),
            mat("--night-ink-muted"),
            0,
            0.75,
            z,
          );
        const outline = new THREE.LineLoop(
          new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(-11, 0.03, -5.5),
            new THREE.Vector3(11, 0.03, -5.5),
            new THREE.Vector3(11, 0.03, 5.5),
            new THREE.Vector3(-11, 0.03, 5.5),
          ]),
          new THREE.LineBasicMaterial({
            color: token("--crimson-text"),
            transparent: true,
            opacity: 0,
          }),
        );
        root.add(outline);
        groups.push({ root, outline, base, lift: 0 });
      });
      resize();
      for (const element of [
        stage,
        document.querySelector<HTMLElement>(".rl-nav")!!,
      ]) {
        const observer = new ResizeObserver(resize);
        observer.observe(element);
        observers.push(observer);
      }
      rebuildPlayers();
      const look = new THREE.Vector3(),
        desiredLook = new THREE.Vector3(),
        desiredCamera = new THREE.Vector3();
      camera.lookAt(look);
      function frame(time: number) {
        if (disposed) return;
        const dt = Math.min(0.05, (time - lastTime) / 1000 || 0.016);
        lastTime = time;
        const speed = reduce.matches ? 1 : 1 - Math.exp(-dt * 4.5);
        const [ox, oz] = origins[courtIndex];
        if (level === "facility") {
          desiredCamera.set(0, 40, 34);
          desiredLook.set(0, 0, 0);
        } else if (level === "court") {
          desiredCamera.set(ox, 15, oz + 19);
          desiredLook.set(ox, 0, oz);
        } else {
          const [x, z] = playerPositions[playerIndex];
          desiredCamera.set(ox + x + (x < 0 ? -3.6 : 3.6), 4.2, oz + z + 7.2);
          desiredLook.set(ox + x - 1.7, 1, oz + z);
        }
        camera.position.lerp(desiredCamera, speed);
        look.lerp(desiredLook, speed);
        camera.lookAt(look);
        groups.forEach((g, i) => {
          const hover = level === "facility" && hoverCourt === i;
          g.lift +=
            (Number(hover) * 0.22 - g.lift) *
            (reduce.matches ? 1 : 1 - Math.exp(-dt * 7));
          g.root.position.y = g.lift;
          g.outline.material.opacity = hover ? 1 : 0;
        });
        figures.forEach((f) => {
          const hovered =
            level === "court" && f.c === courtIndex && hoverPlayer === f.pIndex;
          f.lift +=
            (Number(hovered) * 0.4 - f.lift) *
            (reduce.matches ? 1 : 1 - Math.exp(-dt * 7));
          f.group.position.y =
            1.35 +
            f.lift +
            (reduce.matches
              ? 0
              : Math.sin(time * 0.00085 + f.pIndex * 0.8) * 0.13);
          f.material.emissiveIntensity = f.lift * 0.7;
          f.glow.material.opacity = f.lift * 1.4;
          f.ring.visible =
            level === "player" &&
            f.c === courtIndex &&
            f.pIndex === playerIndex;
        });
        renderer!.render(scene, camera);
        updateLabels();
        animation = requestAnimationFrame(frame);
      }
      animation = requestAnimationFrame(frame);
      stage.querySelector<HTMLElement>(".facility-loading")!.remove();
    }
  }
  if (!renderer) {
    stage.querySelector<HTMLElement>(".facility-loading")!.textContent =
      "The 3D view needs WebGL. Enable hardware acceleration and reload to try again.";
  }

  return {
    setCourts(courts: Court[]) {
      assignments = courts;
      setView("facility");
      rebuildPlayers();
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(animation);
      observers.forEach((observer) => observer.disconnect());
      document.body.classList.remove("facility-focus-open");
      const geometries = new Set<THREE.BufferGeometry>(),
        materials = new Set<THREE.Material>(),
        textures = new Set<THREE.Texture>();
      scene?.traverse((object) => {
        if (
          object instanceof THREE.Mesh ||
          object instanceof THREE.Line ||
          object instanceof THREE.Sprite
        ) {
          if ("geometry" in object) geometries.add(object.geometry);
          for (const material of Array.isArray(object.material)
            ? object.material
            : [object.material]) {
            materials.add(material);
            if (material instanceof THREE.MeshStandardMaterial) {
              if (material.map) textures.add(material.map);
              if (material.bumpMap) textures.add(material.bumpMap);
            }
            if (material instanceof THREE.SpriteMaterial && material.map)
              textures.add(material.map);
          }
        }
      });
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      renderer?.dispose();
      container.replaceChildren();
    },
  };
}
