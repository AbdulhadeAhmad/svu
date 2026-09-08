import { createGraphLayout } from "./layout.js";
import { NODE_W, NODE_H } from "./dimensions.js";
import { el } from "../ui/dom.js";

export function createGraphView({ catalog, curriculum, progress, state, filters, i18n, onSelect }) {
  const { subjectsById, getUpstream, getDownstream } = curriculum;
  const currentFaculty = catalog;
  const userProgress = state;
  const { getNodeStatus, getCurrentAttempt } = progress;
  const { buildLayout } = createGraphLayout(curriculum);
  const layout = buildLayout();
  let currentHighlight = null;
  function render() {
    const svg = document.getElementById("graph");
    svg.innerHTML = "";

    svg.setAttribute("viewBox", `0 0 ${layout.totalWidth} ${layout.totalHeight}`);
    svg.setAttribute("width", layout.totalWidth);
    svg.setAttribute("height", layout.totalHeight);

    // Arrow markers
    const defs = el("defs");
    defs.appendChild(el("marker", {
      id: "arrow",
      viewBox: "0 0 10 10",
      refX: 9, refY: 5,
      markerWidth: 7, markerHeight: 7,
      orient: "auto-start-reverse"
    }, [el("path", { d: "M 0 0 L 10 5 L 0 10 z", fill: "#a0aec0" })]));
    defs.appendChild(el("marker", {
      id: "arrow-active",
      viewBox: "0 0 10 10",
      refX: 9, refY: 5,
      markerWidth: 7, markerHeight: 7,
      orient: "auto-start-reverse"
    }, [el("path", { d: "M 0 0 L 10 5 L 0 10 z", fill: "#ed8936" })]));
    svg.appendChild(defs);

    // Edges
    const edgesGroup = el("g", { id: "edges" });
    svg.appendChild(edgesGroup);

    Object.values(subjectsById).forEach(s => {
      s.prereq.forEach(p => {
        if (!layout.positions[p] || !layout.positions[s.id]) return;
        const from = layout.positions[p];
        const to = layout.positions[s.id];
        const x1 = from.x + NODE_W;
        const y1 = from.y + NODE_H / 2;
        const x2 = to.x;
        const y2 = to.y + NODE_H / 2;
        const dx = (x2 - x1) * 0.5;
        const path = el("path", {
          class: "edge",
          d: `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`,
          "data-from": p,
          "data-to": s.id
        });
        edgesGroup.appendChild(path);
      });
    });

    // Nodes
    const nodesGroup = el("g", { id: "nodes" });
    svg.appendChild(nodesGroup);

    Object.entries(layout.positions).forEach(([id, pos]) => {
      const s = subjectsById[id];
      const cat = currentFaculty.categories[s.category];
      const status = getNodeStatus(id);
      // Retakes can be available while keeping their failed-attempt status.
      const available = progress.isAvailableNext(id);
      const current = getCurrentAttempt(id);
      const g = el("g", {
        class: `node${status ? " " + status : ""}${available ? " is-available" : ""}`,
        "data-id": id,
        transform: `translate(${pos.x}, ${pos.y})`
      });
      if (available) {
        g.appendChild(el("title", {}, [document.createTextNode(`${s.id} · ${i18n.t("availableNext")}`)]));
        g.appendChild(el("rect", {
          class: "availability-outline", x: -3, y: -1,
          width: NODE_W + 6, height: NODE_H + 2, rx: 9, ry: 9,
          "aria-hidden": "true"
        }));
      }

      // Gradient background (slightly darker on bottom for depth)
      const gradId = `grad-${s.category}-${pos.x}-${pos.y}`;
      const grad = el("linearGradient", { id: gradId, x1: "0", y1: "0", x2: "0", y2: "1" });
      grad.appendChild(el("stop", { offset: "0%", "stop-color": cat.color }));
      grad.appendChild(el("stop", { offset: "100%", "stop-color": cat.stroke }));
      defs.appendChild(grad);

      g.appendChild(el("rect", {
        class: "node-card",
        x: 0, y: 0,
        width: NODE_W, height: NODE_H,
        rx: 7, ry: 7,
        fill: `url(#${gradId})`,
        stroke: cat.stroke
      }));

      // Course code
      g.appendChild(el("text", {
        class: "code",
        x: NODE_W / 2, y: 16,
        "text-anchor": "middle"
      }, [document.createTextNode(s.id)]));

      // Truncated name (Arabic-aware: ~18 chars max because Arabic glyphs are wider)
      let name = i18n.language === "ar" && s.nameAr ? s.nameAr : s.name;
      const maxLen = i18n.language === "ar" ? 18 : 26;
      if (name.length > maxLen) name = name.slice(0, maxLen - 1) + "…";
      g.appendChild(el("text", {
        class: "name",
        x: NODE_W / 2, y: 30
      }, [document.createTextNode(name)]));

      if (available) {
        g.appendChild(el("rect", {
          class: "availability-badge", x: 6, y: 35,
          width: NODE_W - 12, height: 14, rx: 4
        }));
        g.appendChild(el("text", {
          class: "availability-label", x: NODE_W / 2, y: 45,
          "text-anchor": "middle"
        }, [document.createTextNode(`→ ${i18n.t("availableBadge")} · ${s.registration_credits ?? s.credits} ${i18n.language === "ar" ? "س" : "cr"}`)]));
      } else {
        g.appendChild(el("text", {
          class: "meta-text",
          x: NODE_W / 2, y: 44
        }, [document.createTextNode(`${s.credits} ${i18n.language === "ar" ? "س" : "CR"} · ${i18n.language === "ar" ? "م" : "L"}${s.lvl}`)]));
      }

      // Status badge (top-right)
      const bx = NODE_W - 9, by = 9;
      if (current || userProgress.manualPass[id]) {
        let badgeColor = "#94a3b8";
        let iconPath = "";
        if (status === "passed")       { badgeColor = "#16a34a"; iconPath = `M ${bx-3} ${by} L ${bx-0.5} ${by+2.5} L ${bx+3} ${by-2.5}`; }
        else if (status === "failed")  { badgeColor = "#dc2626"; iconPath = `M ${bx-3} ${by-3} L ${bx+3} ${by+3} M ${bx+3} ${by-3} L ${bx-3} ${by+3}`; }
        else if (status === "in-progress") { badgeColor = "#d97706"; iconPath = `M ${bx-3} ${by-2.5} L ${bx+3} ${by-2.5} M ${bx} ${by-2.5} L ${bx} ${by+2.5} M ${bx-3} ${by+2.5} L ${bx+3} ${by+2.5}`; }

        g.appendChild(el("circle", {
          cx: bx, cy: by, r: 6.5,
          fill: badgeColor, stroke: "#fff", "stroke-width": 1.5
        }));
        if (iconPath) {
          g.appendChild(el("path", {
            d: iconPath,
            stroke: "#fff", "stroke-width": 1.6, fill: "none",
            "stroke-linecap": "round", "stroke-linejoin": "round"
          }));
        }
      } else if (status === "available-next") {
        g.appendChild(el("circle", {
          cx: bx, cy: by, r: 5,
          fill: "#16a34a", stroke: "#fff", "stroke-width": 1.5
        }));
        g.appendChild(el("path", {
          d: `M ${bx-2} ${by} L ${bx+2} ${by} M ${bx} ${by-2} L ${bx} ${by+2}`,
          stroke: "#fff", "stroke-width": 1.4, fill: "none",
          "stroke-linecap": "round"
        }));
      }

      // Grade overlay (bottom-right) — uses the LATEST attempt's weighted grade
      if (current) {
        let gradeText = null;
        if (current.weighted !== null) gradeText = current.weighted.toFixed(0);
        else if (current.assignment !== null) gradeText = "A:" + current.assignment.toFixed(0);
        else if (current.final !== null) gradeText = "F:" + current.final.toFixed(0);

        if (gradeText !== null) {
          const gradeX = available ? 5 : NODE_W - 36;
          const gradeY = available ? 5 : NODE_H - 14;
          g.appendChild(el("rect", {
            class: "grade-background",
            x: gradeX, y: gradeY,
            width: 32, height: 11, rx: 3,
            fill: "rgba(0, 0, 0, 0.22)"
          }));
          g.appendChild(el("text", {
            class: "grade-overlay",
            x: gradeX + 16, y: gradeY + 8.5,
            "text-anchor": "middle"
          }, [document.createTextNode(gradeText)]));
        }
      }

      g.addEventListener("click", () => onSelect(id));
      g.addEventListener("mouseenter", () => highlightPath(id, true));
      g.addEventListener("mouseleave", () => highlightPath(id, false));
      nodesGroup.appendChild(g);
    });

    applyFilters();
  }
  function highlightPath(id, on) {
    const svg = document.getElementById("graph");
    if (!on) {
      if (currentHighlight) currentHighlight = null;
      applyFilters();
      return;
    }
    currentHighlight = id;
    const upstream = getUpstream(id);
    upstream.add(id);
    const downstream = getDownstream(id);

    svg.querySelectorAll(".node").forEach(n => {
      const nid = n.getAttribute("data-id");
      n.classList.remove("highlighted", "dimmed", "upstream-dim", "downstream-dim");
      if (nid === id) n.classList.add("highlighted");
      else if (upstream.has(nid)) n.classList.add("downstream-dim");
      else if (downstream.has(nid)) n.classList.add("upstream-dim");
      else n.classList.add("dimmed");
    });
    svg.querySelectorAll(".edge").forEach(e => {
      const from = e.getAttribute("data-from");
      const to = e.getAttribute("data-to");
      e.classList.remove("highlighted", "dimmed");
      const inUpstream = upstream.has(from) && upstream.has(to);
      const inDownstream = downstream.has(from) && downstream.has(to);
      const involvesCenter = (from === id || to === id);
      if (inUpstream || inDownstream || involvesCenter) {
        e.classList.add("highlighted");
        e.setAttribute("marker-end", "url(#arrow-active)");
      } else {
        e.setAttribute("marker-end", "url(#arrow)");
      }
    });
  }

  function clearHighlight() {
    const svg = document.getElementById("graph");
    svg.querySelectorAll(".node").forEach(n => n.classList.remove("highlighted", "dimmed", "upstream-dim", "downstream-dim"));
    svg.querySelectorAll(".edge").forEach(e => {
      e.classList.remove("highlighted", "dimmed");
      e.setAttribute("marker-end", "url(#arrow)");
    });
  }
  function applyFilters() {
    const svg = document.getElementById("graph");
    svg.querySelectorAll(".node").forEach(n => {
      n.style.display = filters.isVisible(subjectsById[n.dataset.id]) ? "" : "none";
    });
    svg.querySelectorAll(".edge").forEach(e => {
      e.style.display = filters.isVisible(subjectsById[e.dataset.from]) && filters.isVisible(subjectsById[e.dataset.to]) ? "" : "none";
    });
    applySearch();
  }

  function applySearch() {
    const svg = document.getElementById("graph");
    const q = filters.query.toLowerCase().trim();
    if (!q) {
      svg.querySelectorAll(".node").forEach(n => { n.style.opacity = ""; });
      return;
    }
    svg.querySelectorAll(".node").forEach(n => {
      const id = n.getAttribute("data-id");
      const s = subjectsById[id];
      const match = s.id.toLowerCase().includes(q) ||
                    s.name.toLowerCase().includes(q) ||
                    (s.nameAr || "").includes(q);
      n.style.opacity = match ? "1" : "0.15";
    });
  }
  const graphWrap = document.getElementById("graphWrap");
  let zoom = 1;
  const ZOOM_STEP = 0.15;
  function applyZoom() {
    const svg = document.getElementById("graph");
    svg.style.transformOrigin = "0 0";
    svg.style.transform = `scale(${zoom})`;
  }
  document.getElementById("zoomIn").addEventListener("click", () => {
    zoom = Math.min(2.5, zoom + ZOOM_STEP);
    applyZoom();
  });
  document.getElementById("zoomOut").addEventListener("click", () => {
    zoom = Math.max(0.3, zoom - ZOOM_STEP);
    applyZoom();
  });
  document.getElementById("zoomReset").addEventListener("click", () => {
    zoom = 1;
    applyZoom();
    graphWrap.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  });
  graphWrap.addEventListener("wheel", e => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      if (e.deltaY < 0) zoom = Math.min(2.5, zoom + ZOOM_STEP);
      else zoom = Math.max(0.3, zoom - ZOOM_STEP);
      applyZoom();
    }
  }, { passive: false });

  function focusSubject(id) {
    const node = document.querySelector(`.node[data-id="${id}"]`);
    if (node) {
      node.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
      highlightPath(id, true);
    }
  }

  return { render, applyFilters, clearHighlight, focusSubject };
}
