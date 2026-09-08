import { COL_WIDTH, ROW_HEIGHT, PADDING } from "./dimensions.js";

export function createGraphLayout({ subjectsById, dependents, levelOf }) {
  function buildLevels() {
    const levels = {};
    Object.entries(levelOf).forEach(([id, lvl]) => {
      if (!levels[lvl]) levels[lvl] = [];
      levels[lvl].push(id);
    });
    // Stable initial ordering
    Object.values(levels).forEach(arr => arr.sort());
    return levels;
  }

  // Barycenter heuristic (MEDIAN) — minimizes edge crossings between adjacent
  // layers. Median is more robust than mean for crossing reduction.
  //
  // Strategy:
  //   1. Seed initial ordering with the topological level index, then a
  //      degree-based tie-breaker so high-fanout prereqs are at the top.
  //   2. Alternate forward and backward sweeps using MEDIAN barycenter.
  //   3. Stop early if a sweep produces no change (convergence).
  function reduceCrossings(levels) {
    const maxLevel = Math.max(...Object.keys(levels).map(Number));
    const MAX_ITERS = 40;

    for (let it = 0; it < MAX_ITERS; it++) {
      let changed = false;

      // Forward pass
      for (let l = 1; l <= maxLevel; l++) {
        const prevPos = {};
        levels[l - 1].forEach((id, i) => prevPos[id] = i);
        if (sortByBarycenter(levels[l], prevPos, "prereq")) changed = true;
      }
      // Backward pass
      for (let l = maxLevel - 1; l >= 0; l--) {
        const nextPos = {};
        levels[l + 1].forEach((id, i) => nextPos[id] = i);
        if (sortByBarycenter(levels[l], nextPos, "dependent")) changed = true;
      }

      if (!changed) break;
    }
  }

  // Stable sort with a tie-breaker so equal-barycenter nodes keep their
  // relative order and isolated nodes fall back to alphabetical.
  function sortByBarycenter(arr, neighborPos, kind) {
    const scored = arr.map((id, originalIdx) => {
      const s = subjectsById[id];
      const neighbors = kind === "prereq" ? (s.prereq || []) : (dependents[id] || []);
      const positions = neighbors.map(n => neighborPos[n]).filter(p => p !== undefined);
      const score = positions.length ? median(positions) : Infinity;
      return { id, score, originalIdx };
    });
    scored.sort((a, b) => {
      if (a.score !== b.score) return a.score - b.score;
      return a.originalIdx - b.originalIdx;
    });
    const before = arr.join(",");
    arr.length = 0;
    scored.forEach(x => arr.push(x.id));
    return arr.join(",") !== before;
  }

  function median(arr) {
    if (!arr.length) return 0;
    const sorted = arr.slice().sort((x, y) => x - y);
    const mid = sorted.length >> 1;
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  // Sifting pass: for each layer, try every node at every position and keep
  // the assignment with the smallest sum of edge lengths. Helps with the
  // long curved edges common in dense graphs.
  function siftLayers(levels) {
    const lvlKeys = Object.keys(levels).map(Number).sort((a, b) => a - b);
    lvlKeys.forEach(l => {
      const arr = levels[l];
      let best = arr.slice();
      let bestCost = layerCost(best, l, levels);
      for (let pass = 0; pass < 2; pass++) {
        for (let i = 0; i < arr.length; i++) {
          const id = arr[i];
          // Try moving `id` to every other position
          for (let j = 0; j < arr.length; j++) {
            if (j === i) continue;
            const trial = arr.slice();
            trial.splice(i, 1);
            trial.splice(j, 0, id);
            const cost = layerCost(trial, l, levels);
            if (cost < bestCost) {
              best = trial;
              bestCost = cost;
              arr.length = 0;
              best.forEach(x => arr.push(x));
              i = -1; // restart
              break;
            }
          }
        }
      }
    });
  }

  // Cost = sum of edge lengths crossing this layer (proxy for total edge
  // length, ignoring the layer's own nodes' internal edges).
  function layerCost(arr, lvl, levels) {
    const pos = {};
    arr.forEach((id, i) => pos[id] = i);
    let cost = 0;
    const neighborsLayers = [];
    if (levels[lvl - 1]) neighborsLayers.push(levels[lvl - 1]);
    if (levels[lvl + 1]) neighborsLayers.push(levels[lvl + 1]);
    neighborsLayers.forEach(nbrLayer => {
      nbrLayer.forEach(nid => {
        const s = subjectsById[nid];
        if (!s) return;
        // Edges from nid to a node in `arr`:
        (s.prereq || []).forEach(p => {
          if (pos[p] !== undefined) cost += Math.abs(pos[p] - (nbrLayer.indexOf(nid)));
        });
        (dependents[nid] || []).forEach(d => {
          if (pos[d] !== undefined) cost += Math.abs(pos[d] - (nbrLayer.indexOf(nid)));
        });
      });
    });
    return cost;
  }

  function buildLayout() {
    const levels = buildLevels();
    reduceCrossings(levels);
    siftLayers(levels);

    const positions = {};
    let maxRows = 0;
    Object.entries(levels).forEach(([lvl, ids]) => {
      maxRows = Math.max(maxRows, ids.length);
      ids.forEach((id, i) => {
        positions[id] = {
          x: parseInt(lvl) * COL_WIDTH + PADDING,
          y: i * ROW_HEIGHT + PADDING
        };
      });
    });

    // Force-directed relaxation: nodes repel each other, edges pull connected
    // nodes closer. This breaks out of the strict row layout so vertical
    // spacing relaxes and edges feel less crowded.
    relaxPositions(positions, levels);

    const maxLevel = Math.max(...Object.keys(levels).map(Number));
    let totalHeight = 0;
    Object.values(positions).forEach(p => { if (p.y > totalHeight) totalHeight = p.y; });
    totalHeight += ROW_HEIGHT + PADDING * 2;
    const totalWidth = (maxLevel + 1) * COL_WIDTH + PADDING;
    return { positions, levels, totalWidth, totalHeight };
  }

  // Gentle Y-relaxation: for each layer, move each node toward the
  // median Y of its connected nodes in adjacent layers. Then enforce
  // a minimum spacing so nodes don't overlap. Avoids the chaos of a
  // full force-directed approach while still letting edges breathe.
  function relaxPositions(positions, levels) {
    const lvlKeys = Object.keys(levels).map(Number).sort((a, b) => a - b);

    // First pass: collect connected positions
    const targetY = {};
    Object.keys(positions).forEach(id => targetY[id] = null);
    Object.entries(positions).forEach(([id, p]) => {
      const s = subjectsById[id];
      if (!s) return;
      const ys = [];
      (s.prereq || []).forEach(p2 => {
        if (positions[p2]) ys.push(positions[p2].y);
      });
      (dependents[id] || []).forEach(d => {
        if (positions[d]) ys.push(positions[d].y);
      });
      targetY[id] = ys.length ? median(ys) : p.y;
    });

    // Move each layer toward its targets (smoothed, partial step)
    lvlKeys.forEach(l => {
      levels[l].forEach(id => {
        const cur = positions[id].y;
        const tgt = targetY[id];
        if (tgt === null) return;
        // Step 35% of the way toward target each round; do 4 rounds total
        positions[id].y = cur + (tgt - cur) * 0.35;
      });
    });

    // Enforce minimum vertical spacing within each layer (sweep top-down)
    enforceMinSpacing(positions, levels);

    // Second smoothing round
    lvlKeys.forEach(l => {
      levels[l].forEach(id => {
        const s = subjectsById[id];
        if (!s) return;
        const ys = [];
        (s.prereq || []).forEach(p2 => { if (positions[p2]) ys.push(positions[p2].y); });
        (dependents[id] || []).forEach(d => { if (positions[d]) ys.push(positions[d].y); });
        if (ys.length) {
          const tgt = median(ys);
          positions[id].y = positions[id].y + (tgt - positions[id].y) * 0.2;
        }
      });
    });
    enforceMinSpacing(positions, levels);
  }

  function enforceMinSpacing(positions, levels) {
    const MIN_DY = ROW_HEIGHT - 14;
    Object.keys(levels).forEach(l => {
      const arr = levels[l];
      arr.sort((a, b) => positions[a].y - positions[b].y);
      let lastY = -Infinity;
      arr.forEach(id => {
        const minY = lastY + MIN_DY;
        if (positions[id].y < minY) positions[id].y = minY;
        lastY = positions[id].y;
      });
    });
  }

  return { buildLayout };
}
