import * as THREE from "three";
import type { Court, Profile } from "@rally/types";
import { primaryStyle } from "@rally/matching";
import { courtCameraOffset } from "./court-layout";
export type FacilityController = {
  setCourts(courts: Court[], animate?: boolean): Promise<void>;
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
  container.innerHTML = `<div class="facility-view"><div class="facility-placeholder" hidden></div><div class="facility-stage"><div class="facility-labels"></div><div class="focus-chrome" hidden><button class="ch-btn ch-btn-outline view-back" type="button">Back to facility</button><div class="focus-court-title"></div></div><section class="signature-profile" aria-label="Player profile" hidden></section><div class="player-switch" hidden><button type="button" class="ch-btn ch-btn-outline previous">Previous</button><span class="selected-name"></span><button type="button" class="ch-btn ch-btn-outline next">Next</button></div><div class="facility-loading" role="status">Preparing the facility.</div></div></div>`;
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
  const placeholder = container.querySelector<HTMLElement>(
    ".facility-placeholder",
  )!;
  const look = new THREE.Vector3();
  let cameraMove:
    | { started: number; from: THREE.Vector3; lookFrom: THREE.Vector3 }
    | undefined;
  let viewportMove:
    | {
        started: number;
        from: DOMRect;
        to: { left: number; top: number; width: number; height: number };
        focused: boolean;
      }
    | undefined;
  let groups: {
    root: THREE.Group;
    outline: THREE.LineLoop<THREE.BufferGeometry, THREE.LineBasicMaterial>;
    base: THREE.Mesh;
    lift: number;
  }[] = [];
  let figures: {
    id: string;
    group: THREE.Group;
    ring: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>;
    glow: THREE.Sprite;
    shadow: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
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
  let shuffle:
    | {
        started: number;
        starts: Map<string, THREE.Vector3>;
        oldScores: number[];
        complete: () => void;
      }
    | undefined;
  const observers: ResizeObserver[] = [];
  function playstyle(p: Profile) {
    const styles = [
      ["power", "Power hitter"],
      ["kitchen", "Kitchen specialist"],
      ["mobility", "High mobility"],
      ["readiness", "High readiness"],
    ] as const;
    return styles.find(([kind]) => kind === primaryStyle(p))!;
  }
  const origins = [
    [-12.2, -7],
    [12.2, -7],
    [-12.2, 7],
    [12.2, 7],
  ];
  const playerPositions = [
    [-5.5, -2.5],
    [-5.5, 2.5],
    [5.5, -2.5],
    [5.5, 2.5],
  ];
  function setView(next: View, c = courtIndex, p = playerIndex) {
    if (shuffle && next !== "facility") return;
    if (level === "facility" && next !== "facility")
      lastFocus =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : undefined;
    const wasFocused = level !== "facility";
    const previousRect = stage.getBoundingClientRect();
    cameraMove =
      renderer && !reduce.matches
        ? {
            started: performance.now(),
            from: camera.position.clone(),
            lookFrom: look.clone(),
          }
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
    if (focused !== wasFocused && !reduce.matches && renderer) {
      if (focused && placeholder.hidden) {
        placeholder.style.height = previousRect.height + "px";
        placeholder.hidden = false;
      }
      const navHeight = document
        .querySelector<HTMLElement>(".rl-nav")!
        .getBoundingClientRect().height;
      const targetRect = placeholder.getBoundingClientRect();
      viewportMove = {
        started: performance.now(),
        from: previousRect,
        to: focused
          ? {
              left: 0,
              top: navHeight,
              width: document.documentElement.clientWidth,
              height: innerHeight - navHeight,
            }
          : {
              left: targetRect.left,
              top: targetRect.top,
              width: targetRect.width,
              height: targetRect.height,
            },
        focused,
      };
      stage.classList.add("facility-focused");
      document.body.classList.add("facility-focus-open");
      Object.assign(stage.style, {
        left: previousRect.left + "px",
        top: previousRect.top + "px",
        width: previousRect.width + "px",
        height: previousRect.height + "px",
        right: "auto",
        bottom: "auto",
      });
    } else if (!viewportMove) {
      stage.classList.toggle("facility-focused", focused);
      document.body.classList.toggle("facility-focus-open", focused);
      placeholder.hidden = !focused;
      if (focused && !wasFocused)
        placeholder.style.height = previousRect.height + "px";
    }
    stage.classList.toggle("facility-camera-moving", !!cameraMove);
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
    profile.innerHTML = `<div class="eyebrow">Court ${courtIndex + 1} / Team ${playerIndex < 2 ? "A · crimson" : "B · paper"}</div><h2 class="ch-hl ch-hl-h2">${escape(p.name)}</h2><div class="signature-meta">${jersey} · Skill ${p.skill.mu.toFixed(1)} · ${escape(playstyle(p)[1])} · ${escape(p.tempo)} tempo</div><div class="signature-stats">${(
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
      .join("")}</div>`;
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
  function drawPlaystyleIcon(
    ctx: CanvasRenderingContext2D, kind: ReturnType<typeof playstyle>[0],
    x: number, y: number, paper: string, scale = 1,
  ) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.strokeStyle = paper;
    ctx.fillStyle = paper;
    ctx.lineWidth = 6;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    if (kind === "power") {
      ctx.rotate(-0.5);
      ctx.beginPath();
      ctx.ellipse(0, -12, 28, 36, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-7, 23);
      ctx.lineTo(-7, 52);
      ctx.lineTo(7, 52);
      ctx.lineTo(7, 23);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-12, -18);
      ctx.lineTo(12, -18);
      ctx.moveTo(-12, -4);
      ctx.lineTo(12, -4);
      ctx.stroke();
    } else if (kind === "kitchen") {
      ctx.beginPath();
      ctx.moveTo(-28, 10);
      ctx.bezierCurveTo(-62, 0, -45, -48, -17, -31);
      ctx.bezierCurveTo(-12, -65, 28, -63, 31, -32);
      ctx.bezierCurveTo(62, -42, 65, 3, 31, 10);
      ctx.lineTo(29, 37);
      ctx.lineTo(-28, 37);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-27, 22);
      ctx.lineTo(29, 22);
      ctx.stroke();
    } else if (kind === "mobility") {
      ctx.beginPath();
      ctx.moveTo(-39, -26);
      ctx.lineTo(-12, -26);
      ctx.lineTo(1, -5);
      ctx.lineTo(39, 8);
      ctx.quadraticCurveTo(49, 12, 46, 31);
      ctx.lineTo(-43, 31);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-40, 18);
      ctx.lineTo(45, 18);
      ctx.moveTo(-8, -8);
      ctx.lineTo(-17, 3);
      ctx.moveTo(5, -2);
      ctx.lineTo(-2, 9);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.ellipse(-4, 0, 40, 23, -0.15, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(33, 0);
      ctx.lineTo(55, 29);
      ctx.lineTo(38, 25);
      ctx.lineTo(42, 45);
      ctx.lineTo(22, 13);
      ctx.stroke();
    }
    ctx.restore();
  }
  function drawRatingStars(
    ctx: CanvasRenderingContext2D, rating: number,
    x: number, y: number, radius: number, gap: number,
  ) {
    const stars = Math.max(1, Math.min(5, Math.round(rating - 1)));
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = token(i < stars ? "--paper" : "--line");
      ctx.beginPath();
      for (let j = 0; j < 10; j++) {
        const angle = -Math.PI / 2 + (j * Math.PI) / 5;
        const r = j % 2 ? radius * 0.47 : radius;
        const px = x + i * gap + Math.cos(angle) * r;
        const py = y + Math.sin(angle) * r;
        if (j === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    }
  }
  function addStyleMarker(group: THREE.Group, p: Profile) {
    const canvas = document.createElement("canvas");
    canvas.width = 192;
    canvas.height = 232;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = token("--surface");
    ctx.beginPath();
    ctx.roundRect(4, 4, 184, 224, 22);
    ctx.fill();
    ctx.strokeStyle = token("--line-strong");
    ctx.lineWidth = 3;
    ctx.stroke();
    drawPlaystyleIcon(ctx, playstyle(p)[0], 96, 85, token("--paper"), 1.15);
    drawRatingStars(ctx, p.skill.mu, 24, 190, 15, 36);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const marker = new THREE.Sprite(new THREE.SpriteMaterial({
      map: texture, transparent: true, depthTest: false, depthWrite: false,
      toneMapped: false,
    }));
    marker.name = "playstyle-marker";
    marker.renderOrder = 20;
    group.add(marker);
  }
  function addPlayerCard(group: THREE.Group, p: Profile) {
    const [kind, label] = playstyle(p);
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 800;
    const ctx = canvas.getContext("2d")!;
    const paper = token("--paper"),
      muted = token("--ink-muted"),
      accent = token("--crimson");
    const font = token("--font-sans");
    ctx.fillStyle = token("--surface-raised");
    ctx.fillRect(0, 0, 640, 800);
    ctx.strokeStyle = token("--line-strong");
    ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, 636, 796);
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, 640, 9);
    ctx.fillStyle = paper;
    ctx.font = `600 38px ${font}`;
    let nameSize = 38;
    while (ctx.measureText(p.name).width > 552 && nameSize > 22)
      ctx.font = `600 ${--nameSize}px ${font}`;
    ctx.fillText(p.name, 44, 72);

    drawPlaystyleIcon(ctx, kind, 92, 161, paper);
    ctx.fillStyle = muted;
    ctx.font = `500 22px ${font}`;
    ctx.fillText("PLAYSTYLE", 166, 146);
    ctx.fillStyle = paper;
    ctx.font = `600 28px ${font}`;
    ctx.fillText(label, 166, 184);
    ctx.fillStyle = token("--surface");
    ctx.fillRect(40, 239, 560, 112);
    ctx.fillStyle = paper;
    ctx.font = `600 55px ${font}`;
    ctx.fillText(p.skill.mu.toFixed(1), 65, 311);
    ctx.fillStyle = muted;
    ctx.font = `500 19px ${font}`;
    ctx.fillText("SKILL", 177, 279);
    drawRatingStars(ctx, p.skill.mu, 193, 311, 17, 43);
    const stats: [string, number][] = [
      ["Power", p.style.power],
      ["Kitchen", p.style.kitchen],
      ["Mobility", p.style.mobility],
      ["Readiness", p.style.readiness],
    ];
    stats.forEach(([name, value], i) => {
      const y = 402 + i * 87;
      ctx.fillStyle = muted;
      ctx.font = `500 25px ${font}`;
      ctx.textAlign = "left";
      ctx.fillText(name, 44, y);
      ctx.fillStyle = paper;
      ctx.font = `600 27px ${font}`;
      ctx.textAlign = "right";
      ctx.fillText(String(Math.round(value * 100)), 596, y);
      ctx.fillStyle = token("--line");
      ctx.fillRect(44, y + 19, 552, 8);
      ctx.fillStyle = accent;
      ctx.fillRect(44, y + 19, 552 * value, 8);
    });
    ctx.textAlign = "left";
    ctx.fillStyle = muted;
    ctx.font = `500 20px ${font}`;
    ctx.fillText(`${p.tempo.toUpperCase()} TEMPO`, 44, 759);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(
      8,
      renderer?.capabilities.getMaxAnisotropy() ?? 1,
    );
    const card = new THREE.Group();
    card.name = "player-card";
    card.visible = false;
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(3.52, 4.4, 0.12),
      new THREE.MeshStandardMaterial({
        color: token("--line"),
        roughness: 0.45,
        metalness: 0.25,
      }),
    );
    card.add(body);
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(3.5, 4.375),
      new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }),
    );
    face.position.z = 0.065;
    card.add(face);
    group.add(card);
  }
  function rebuildPlayers() {
    if (!renderer) return;
    figures.forEach((f) => {
      f.group.parent?.remove(f.group);
      f.ring.parent?.remove(f.ring);
      f.group.traverse((o) => {
        if (
          o instanceof THREE.Mesh &&
          o.geometry !== pickleGeometry?.outer &&
          o.geometry !== pickleGeometry?.inner &&
          o.geometry !== pickleGeometry?.walls
        )
          o.geometry.dispose();
        if (o instanceof THREE.Mesh || o instanceof THREE.Sprite) {
          if (o instanceof THREE.Mesh || o instanceof THREE.Sprite) {
            const materials = Array.isArray(o.material)
              ? o.material
              : [o.material];
            materials.forEach((m) => {
              if (
                m instanceof THREE.MeshBasicMaterial ||
                m instanceof THREE.MeshStandardMaterial ||
                m instanceof THREE.SpriteMaterial
              )
                m.map?.dispose();
              m.dispose();
            });
          }
        }
      });
      f.shadow.removeFromParent();
      f.shadow.geometry.dispose();
      f.shadow.material.map?.dispose();
      f.shadow.material.dispose();
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
        group.position.set(x, 1.1, z);
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
        addPlayerCard(group, p);
        addStyleMarker(group, p);
        const shell = new THREE.Mesh(geometry.outer, m);
        shell.castShadow = true;
        shell.receiveShadow = true;
        group.add(shell);
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
          hue =
            "#" +
            new THREE.Color(
              token(isA ? "--crimson" : "--paper"),
            ).getHexString();
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
        const shadowCanvas = document.createElement("canvas");
        shadowCanvas.width = shadowCanvas.height = 64;
        const shadowContext = shadowCanvas.getContext("2d")!;
        const shadowGradient = shadowContext.createRadialGradient(
          32,
          32,
          2,
          32,
          32,
          32,
        );
        shadowGradient.addColorStop(0, "rgba(0,0,0,0.65)");
        shadowGradient.addColorStop(0.4, "rgba(0,0,0,0.3)");
        shadowGradient.addColorStop(1, "rgba(0,0,0,0)");
        shadowContext.fillStyle = shadowGradient;
        shadowContext.fillRect(0, 0, 64, 64);
        const contactShadow = new THREE.Mesh(
          new THREE.PlaneGeometry(3.4, 2.6),
          new THREE.MeshBasicMaterial({
            map: new THREE.CanvasTexture(shadowCanvas),
            transparent: true,
            depthWrite: false,
          }),
        );
        contactShadow.rotation.x = -Math.PI / 2;
        contactShadow.position.set(x, 0.055, z);
        groups[c].root.add(contactShadow);
        figures.push({
          id,
          group,
          ring,
          glow,
          shadow: contactShadow,
          material: m,
          c,
          pIndex,
          lift: 0,
        });
        const label = document.createElement("button");
        label.type = "button";
        label.className = "facility-player-hit";
        label.setAttribute(
          "aria-label",
          `Inspect ${p.name}, ${playstyle(p)[1]}, skill ${p.skill.mu.toFixed(1)}, power ${Math.round(p.style.power * 100)}, kitchen ${Math.round(p.style.kitchen * 100)}, mobility ${Math.round(p.style.mobility * 100)}, readiness ${Math.round(p.style.readiness * 100)}`,
        );
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
    // Keep a stable drawing buffer while the canvas bounds animate.
    renderer.setSize(
      viewportMove
        ? Math.max(viewportMove.from.width, viewportMove.to.width)
        : stage.clientWidth,
      viewportMove
        ? Math.max(viewportMove.from.height, viewportMove.to.height)
        : stage.clientHeight,
      false,
    );
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
      button.disabled = !!shuffle;
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
    camera.position.set(0, 32.9, 31.2);
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    } catch (error) {
      console.warn(error);
    }
    if (renderer) {
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
      renderer.setClearColor(0, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.25;
      renderer.domElement.setAttribute("aria-hidden", "true");
      stage.prepend(renderer.domElement);
      scene.add(
        new THREE.HemisphereLight(token("--paper"), token("--night"), 0.9),
      );
      const sun = new THREE.DirectionalLight(token("--paper"), 2.1);
      sun.position.set(-18, 35, -12);
      sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
      Object.assign(sun.shadow.camera, {
        left: -40,
        right: 40,
        top: 32,
        bottom: -32,
        near: 1,
        far: 100,
      });
      sun.shadow.normalBias = 0.035;
      sun.shadow.bias = -0.0003;
      sun.shadow.radius = 3;
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
      // The facility is one continuous plaza, not four disconnected cards.
      const architecture = new THREE.Group();
      scene.add(architecture);
      const dark = mat("--surface-raised", {
        color: new THREE.Color(token("--surface-raised")).multiplyScalar(0.8),
        roughness: 0.95,
      });
      const trim = mat("--line", {
        color: new THREE.Color(token("--line")).multiplyScalar(0.8),
        roughness: 0.8,
        metalness: 0.15,
      });
      const sunk = mat("--surface-sunk", { roughness: 0.95 });
      const redLight = mat("--crimson", {
        emissive: token("--crimson"),
        emissiveIntensity: 1,
      });
      function rounded(w: number, d: number, h: number, r: number) {
        const path = new THREE.Shape();
        path.moveTo(-w / 2 + r, -d / 2);
        path.lineTo(w / 2 - r, -d / 2);
        path.quadraticCurveTo(w / 2, -d / 2, w / 2, -d / 2 + r);
        path.lineTo(w / 2, d / 2 - r);
        path.quadraticCurveTo(w / 2, d / 2, w / 2 - r, d / 2);
        path.lineTo(-w / 2 + r, d / 2);
        path.quadraticCurveTo(-w / 2, d / 2, -w / 2, d / 2 - r);
        path.lineTo(-w / 2, -d / 2 + r);
        path.quadraticCurveTo(-w / 2, -d / 2, -w / 2 + r, -d / 2);
        const geo = new THREE.ExtrudeGeometry(path, {
          depth: h,
          bevelEnabled: true,
          bevelSize: 0.06,
          bevelThickness: 0.05,
          bevelSegments: 2,
          steps: 1,
          curveSegments: 12,
        });
        geo.rotateX(-Math.PI / 2);
        return geo;
      }
      function prop(
        geo: THREE.BufferGeometry,
        material: THREE.Material,
        x: number,
        y: number,
        z: number,
        parent: THREE.Group = architecture,
      ) {
        const mesh = new THREE.Mesh(geo, material);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        parent.add(mesh);
        return mesh;
      }
      prop(rounded(67, 43, 0.45, 9), dark, 0, -1.05, 0);
      const perimeter = new THREE.EdgesGeometry(
        rounded(66.8, 42.8, 0.05, 9),
        35,
      );
      const rim = new THREE.LineSegments(
        perimeter,
        new THREE.LineBasicMaterial({
          color: token("--crimson"),
          transparent: true,
          opacity: 0.28,
        }),
      );
      rim.position.y = -0.57;
      architecture.add(rim);
      function lightStrip(
        x: number,
        y: number,
        z: number,
        width: number,
        turn = false,
      ) {
        const bar = prop(
          new THREE.BoxGeometry(width, 0.075, 0.09),
          redLight,
          x,
          y,
          z,
        );
        if (turn) bar.rotation.y = Math.PI / 2;
        const light = new THREE.PointLight(token("--crimson"), 12, 7, 2);
        light.position.set(x, y + 0.15, z);
        architecture.add(light);
      }
      function bench(x: number, z: number, turn = false) {
        const g = new THREE.Group();
        g.position.set(x, -0.5, z);
        if (turn) g.rotation.y = Math.PI / 2;
        architecture.add(g);
        for (let k = 0; k < 5; k++)
          prop(
            new THREE.BoxGeometry(12, 0.17, 0.28),
            trim,
            0,
            1.15,
            (k - 2) * 0.34,
            g,
          );
        for (const px of [-4.7, 4.7])
          prop(new THREE.BoxGeometry(0.25, 1.1, 1.5), dark, px, 0.5, 0, g);
        lightStrip(x, -0.05, z + (turn ? 0 : 0.7), 10, turn);
      }
      bench(-9, 18);
      bench(9, 18);
      bench(-27, 0, true);
      bench(27, 0, true);
      // Low bleachers at the two outside edges.
      for (const sign of [-1, 1])
        for (let row = 0; row < 3; row++) {
          prop(
            new THREE.BoxGeometry(1.5, 0.7 + row * 0.65, 22),
            dark,
            sign * (29.7 + row * 1.35),
            -0.4 + (0.7 + row * 0.65) / 2,
            0,
          );
          lightStrip(sign * (29 + row * 1.35), -0.1 + row * 0.65, 0, 21, true);
        }
      function planter(x: number, z: number) {
        const g = new THREE.Group();
        g.position.set(x, -0.5, z);
        architecture.add(g);
        prop(rounded(10, 4.6, 0.65, 2.2), trim, 0, 0, 0, g);
        prop(rounded(9.5, 4.1, 0.12, 1.9), sunk, 0, 0.65, 0, g);
        for (let k = 0; k < 3; k++) {
          const rock = prop(
            new THREE.SphereGeometry(1, 14, 10),
            dark,
            -2 + k * 1.6,
            0.8,
            0.1 + (k % 2) * 0.35,
            g,
          );
          rock.scale.set(1.3, 0.8 + k * 0.28, 1.1);
        }
      }
      planter(-26, -18);
      planter(26, -18);
      planter(-26, 18);
      planter(26, 18);
      // Slatted shelter and picnic table at the head of the plaza.
      for (const x of [-7.5, 7.5])
        for (const z of [-20, -16])
          prop(new THREE.BoxGeometry(0.45, 5, 0.45), dark, x, 1.9, z);
      for (let k = 0; k < 8; k++)
        prop(
          new THREE.BoxGeometry(16, 0.22, 0.28),
          trim,
          0,
          4.5,
          -20.5 + k * 0.7,
        );
      for (const x of [-7.7, 7.7])
        prop(new THREE.BoxGeometry(0.3, 0.5, 5.5), trim, x, 4.35, -18);
      prop(new THREE.BoxGeometry(7, 0.25, 1.7), trim, 0, 1.2, -17.6);
      for (const z of [-19, -16.2])
        prop(new THREE.BoxGeometry(7.5, 0.2, 0.7), dark, 0, 0.65, z);
      for (const x of [-2.5, 2.5])
        prop(new THREE.BoxGeometry(0.25, 1.6, 3.3), dark, x, 0.25, -17.6);
      lightStrip(-4, 3.75, -19.8, 2.5);
      lightStrip(4, 3.75, -19.8, 2.5);
      for (const x of [-10, 10]) {
        prop(
          new THREE.CylinderGeometry(0.65, 0.7, 1.9, 24),
          dark,
          x,
          0.4,
          -17.5,
        );
        prop(
          new THREE.TorusGeometry(0.65, 0.06, 6, 24),
          trim,
          x,
          1.35,
          -17.5,
        ).rotation.x = Math.PI / 2;
      }
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
          object.castShadow = true;
          object.receiveShadow = true;
          root.add(object);
          return object;
        };
        const base = add(rounded(22, 11, 0.55, 0.65), dark, 0, -0.75, 0);
        add(
          new THREE.BoxGeometry(20, 0.07, 9.09),
          mat("--crimson-deep", {
            color: new THREE.Color(token("--crimson-deep")).multiplyScalar(
              0.65,
            ),
            roughness: 1,
          }),
          0,
          -0.08,
          0,
        );
        add(
          new THREE.BoxGeometry(6.36, 0.08, 9.09),
          mat("--crimson", {
            color: new THREE.Color(token("--crimson")).multiplyScalar(0.75),
            roughness: 1,
          }),
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
      const desiredLook = new THREE.Vector3(),
        desiredCamera = new THREE.Vector3();
      camera.lookAt(look);
      function frame(time: number) {
        if (disposed) return;
        const dt = Math.min(0.05, (time - lastTime) / 1000 || 0.016);
        lastTime = time;
        const speed = reduce.matches ? 1 : 1 - Math.exp(-dt * 4.5);
        if (viewportMove) {
          const t = Math.min(1, (time - viewportMove.started) / 1000);
          const eased = t * t * t * (t * (t * 6 - 15) + 10);
          for (const key of ["left", "top", "width", "height"] as const)
            stage.style[key] =
              THREE.MathUtils.lerp(
                viewportMove.from[key],
                viewportMove.to[key],
                eased,
              ) + "px";
          camera.aspect = stage.clientWidth / stage.clientHeight;
          camera.updateProjectionMatrix();
          if (t === 1) {
            const focused = viewportMove.focused;
            viewportMove = undefined;
            stage.removeAttribute("style");
            stage.classList.toggle("facility-focused", focused);
            document.body.classList.toggle("facility-focus-open", focused);
            placeholder.hidden = !focused;
            resize();
          }
        }
        const [ox, oz] = origins[courtIndex];
        if (level === "facility") {
          const fit = 0.927 * Math.max(1, 1.85 / camera.aspect);
          desiredCamera.set(0, 35.5 * fit, 33.65 * fit);
          desiredLook.set(0, 0, 0);
        } else if (level === "court") {
          desiredLook.set(ox, 0, oz);
          // Fit the whole court into the space between the card columns.
          desiredCamera.copy(desiredLook).add(courtCameraOffset(
            stage.clientWidth, stage.clientHeight, camera.fov,
          ));
        } else {
          const [x, z] = playerPositions[playerIndex];
          desiredCamera.set(ox + x + (x < 0 ? -3.6 : 3.6), 4.2, oz + z + 7.2);
          desiredLook.set(ox + x - 1.7, 1, oz + z);
        }
        if (cameraMove) {
          const t = Math.min(1, (time - cameraMove.started) / 1100);
          const eased = t * t * t * (t * (t * 6 - 15) + 10);
          camera.position.lerpVectors(cameraMove.from, desiredCamera, eased);
          look.lerpVectors(cameraMove.lookFrom, desiredLook, eased);
          if (t === 1) {
            cameraMove = undefined;
            stage.classList.remove("facility-camera-moving");
          }
        } else {
          camera.position.lerp(desiredCamera, speed);
          look.lerp(desiredLook, speed);
        }
        camera.lookAt(look);
        // Projection/unprojection below must use this frame's camera transform.
        camera.updateMatrixWorld();
        groups.forEach((g, i) => {
          const hover = level === "facility" && hoverCourt === i;
          g.lift +=
            (Number(hover) * 0.22 - g.lift) *
            (reduce.matches ? 1 : 1 - Math.exp(-dt * 7));
          g.root.position.y = g.lift;
          g.outline.material.opacity = hover ? 1 : 0;
        });
        const progress = shuffle
          ? Math.min(1, (time - shuffle.started) / 3600)
          : 1;
        const ease = (v: number) => {
          const t = THREE.MathUtils.clamp(v, 0, 1);
          return t * t * (3 - 2 * t);
        };
        figures.forEach((f, index) => {
          const card = f.group.getObjectByName("player-card");
          if (card) {
            const active = level !== "facility" && f.c === courtIndex && !shuffle
              && (level === "court" || f.pIndex === playerIndex);
            const opacity = THREE.MathUtils.lerp(
              Number(card.userData.opacity ?? 0), Number(active),
              reduce.matches ? 1 : 1 - Math.exp(-dt * 6),
            );
            card.userData.opacity = opacity;
            card.visible = opacity > 0.005;
            card.traverse((node) => {
              if (node instanceof THREE.Mesh) {
                node.material.transparent = true;
                node.material.opacity = opacity;
              }
            });
          }
          f.shadow.visible = !shuffle;
          if (shuffle) {
            const start = shuffle.starts.get(f.id)!;
            const [cx, cz] = origins[f.c];
            const [px, pz] = playerPositions[f.pIndex];
            const destination = new THREE.Vector3(cx + px, 1.1, cz + pz);
            const angle =
              (index / figures.length) * Math.PI * 2 +
              ease(progress / 0.6) * Math.PI * 1.5;
            const orbit = new THREE.Vector3(
              Math.cos(angle) * 9,
              5.5 + (index % 3) * 0.8,
              Math.sin(angle) * 4.5,
            );
            if (progress < 0.55)
              f.group.position.lerpVectors(start, orbit, ease(progress / 0.3));
            else {
              const arrival = ease((progress - 0.55 - f.c * 0.04) / 0.33);
              f.group.position.lerpVectors(orbit, destination, arrival);
              f.group.position.y += Math.sin(arrival * Math.PI) * 2;
            }
            f.group.rotation.y += dt * (1 - ease((progress - 0.55) / 0.35)) * 2;
            f.glow.material.opacity = Math.sin(progress * Math.PI) * 0.35;
            f.ring.visible = false;
            return;
          }
          const hovered =
            level === "court" && f.c === courtIndex && hoverPlayer === f.pIndex;
          f.lift +=
            (Number(hovered) * 0.4 - f.lift) *
            (reduce.matches ? 1 : 1 - Math.exp(-dt * 7));
          f.group.position.y =
            1.1 +
            f.lift +
            (reduce.matches
              ? 0
              : (1 + Math.sin(time * 0.00085 + f.pIndex * 0.8)) * 0.06);
          if (card?.visible) {
            const width = stage.clientWidth,
              height = stage.clientHeight;
            const margin = 18,
              gap = 18;
            // Reserve the Back/title controls and bottom player switcher.
            const top = 100,
              bottom = height - (level === "player" ? 96 : 24);
            const availableHeight = Math.max(80, bottom - top);
            const availableWidth = Math.max(80, width - margin * 2);
            const inSpotlight = level === "player";
            const cardHeight = inSpotlight
              ? Math.min(420, availableHeight, (availableWidth * 0.42) / 0.8)
              : Math.min(
                  250,
                  (availableHeight - gap) / 2,
                  (width * 0.22) / 0.8,
                );
            const cardWidth = cardHeight * 0.8;
            const panelDepth = new THREE.Vector3(0, 0, -2)
              .applyMatrix4(camera.matrixWorld).project(camera).z;
            // Keep panels on a camera-facing plane in front of the scene,
            // instead of embedding them at the balls' depth in the court.
            const depth = 2;
            const worldHeight =
              2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * depth;
            let x: number, y: number;
            const center = f.group.getWorldPosition(new THREE.Vector3());
            const anchor = project(center);
            const ballDepth = -center.clone().applyMatrix4(camera.matrixWorldInverse).z;
            const ballRadius = 0.85 * height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * ballDepth);
            if (inSpotlight) {
              x = THREE.MathUtils.clamp(anchor.x - ballRadius - 16 - cardWidth / 2,
                margin + cardWidth / 2, width - margin - cardWidth / 2);
              y = THREE.MathUtils.clamp(anchor.y, top + cardHeight / 2, bottom - cardHeight / 2);
            } else {
              const side = f.pIndex < 2 ? -1 : 1;
              // Clear both teammates, including the nearer/larger front ball.
              const neighbors = figures.filter(other => other.c === f.c && (other.pIndex < 2) === (f.pIndex < 2));
              const edges = neighbors.map(other => {
                const world = other.group.getWorldPosition(new THREE.Vector3());
                const projected = project(world);
                const distance = -world.clone().applyMatrix4(camera.matrixWorldInverse).z;
                const radius = 0.85 * height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * distance);
                return projected.x + side * (radius + 16 + cardWidth / 2);
              });
              const preferred = side < 0 ? Math.min(...edges) : Math.max(...edges);
              x = THREE.MathUtils.clamp(preferred,
                side < 0 ? margin + cardWidth / 2 : width / 2 + gap / 2 + cardWidth / 2,
                side < 0 ? width / 2 - gap / 2 - cardWidth / 2 : width - margin - cardWidth / 2);
              const middle = top + availableHeight / 2;
              const backRow = f.pIndex % 2 === 0;
              y = THREE.MathUtils.clamp(anchor.y,
                backRow ? top + cardHeight / 2 : middle + gap / 2 + cardHeight / 2,
                backRow ? middle - gap / 2 - cardHeight / 2 : bottom - cardHeight / 2);
            }
            // Keep the same panel alive through camera and player transitions.
            const previous = card.userData.layout ?? { x, y: y + 20, height: cardHeight * 0.92 };
            // Retiring cards fade in place while the selected card follows the camera.
            const retiring = level === "facility" || (level === "player" && f.pIndex !== playerIndex);
            const blend = reduce.matches ? 1 : 1 - Math.exp(-dt * 7);
            const layout = {
              x: THREE.MathUtils.lerp(previous.x, retiring ? previous.x : x, blend),
              y: THREE.MathUtils.lerp(previous.y, retiring ? previous.y : y, blend),
              height: THREE.MathUtils.lerp(previous.height, retiring ? previous.height : cardHeight, blend),
            };
            card.userData.layout = layout;
            // Reconstruct the reserved screen position on the panel plane.
            const position = new THREE.Vector3(
              (layout.x / width) * 2 - 1,
              1 - (layout.y / height) * 2,
              panelDepth,
            ).unproject(camera);
            card.position.copy(f.group.worldToLocal(position));
            card.scale.setScalar(((layout.height / height) * worldHeight) / 4.4);
            const parentRotation = f.group.getWorldQuaternion(
              new THREE.Quaternion(),
            );
            card.quaternion
              .copy(parentRotation.invert())
              .multiply(camera.quaternion);
          }
          f.material.emissiveIntensity = f.lift * 0.7;
          f.glow.material.opacity = f.lift * 1.4;
          f.ring.visible =
            level === "player" &&
            f.c === courtIndex &&
            f.pIndex === playerIndex;
        });
        if (shuffle) {
          courtButtons.forEach((button, i) => {
            const t = ease((progress - 0.65 - i * 0.04) / 0.2);
            const score = THREE.MathUtils.lerp(
              shuffle!.oldScores[i],
              assignments[i].fairness,
              t,
            );
            button.querySelector(
              ".facility-court-tag span:last-child",
            )!.textContent = `Fairness ${score.toFixed(0)}`;
          });
          if (progress === 1) {
            figures.forEach((f) => {
              groups[f.c].root.attach(f.group);
              const [x, z] = playerPositions[f.pIndex];
              f.group.position.set(x, 1.1, z);
              f.group.rotation.set(0.3, f.pIndex * 0.6, 0.2);
            });
            const complete = shuffle.complete;
            shuffle = undefined;
            stage.classList.remove("facility-shuffling");
            complete();
          }
        }
        // Keep each overview icon beside its own ball, including during Rally it.
        figures.forEach(f => {
          const marker = f.group.getObjectByName("playstyle-marker") as THREE.Sprite;
          marker.visible = level === "facility";
          if (!marker.visible) return;
          const world = f.group.getWorldPosition(new THREE.Vector3());
          const anchor = project(world);
          const depth = -world.clone().applyMatrix4(camera.matrixWorldInverse).z;
          const tangent = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
          const radius = 0.85 * stage.clientHeight / (2 * tangent * depth);
          const size = THREE.MathUtils.clamp(stage.clientWidth / 32, 28, 44);
          const x = anchor.x + radius + size / 2 + 6;
          const panelDepth = new THREE.Vector3(0, 0, -2)
            .applyMatrix4(camera.matrixWorld).project(camera).z;
          const position = new THREE.Vector3(
            (x / stage.clientWidth) * 2 - 1,
            1 - (anchor.y / stage.clientHeight) * 2,
            panelDepth,
          ).unproject(camera);
          marker.position.copy(f.group.worldToLocal(position));
          const worldSize = size / stage.clientHeight * 4 * tangent;
          marker.scale.set(worldSize, worldSize * 232 / 192, 1);
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
    async setCourts(courts: Court[], animate = false) {
      shuffle?.complete();
      shuffle = undefined;
      const starts = new Map(
        figures.map((f) => [
          f.id,
          f.group.getWorldPosition(new THREE.Vector3()),
        ]),
      );
      const oldScores = assignments.map((c) => c.fairness);
      assignments = courts;
      setView("facility");
      rebuildPlayers();
      if (!animate || reduce.matches || !renderer) return;
      await new Promise<void>((complete) => {
        shuffle = { started: performance.now(), starts, oldScores, complete };
        figures.forEach((f) => {
          scene.attach(f.group);
          f.group.position.copy(starts.get(f.id)!);
        });
        stage.classList.add("facility-shuffling");
      });
    },
    dispose() {
      disposed = true;
      shuffle?.complete();
      shuffle = undefined;
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
            if (
              material instanceof THREE.MeshStandardMaterial ||
              material instanceof THREE.MeshBasicMaterial
            ) {
              if (material.map) textures.add(material.map);
              if (
                material instanceof THREE.MeshStandardMaterial &&
                material.bumpMap
              )
                textures.add(material.bumpMap);
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
