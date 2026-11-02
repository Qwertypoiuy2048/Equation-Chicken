(function attachGraphSketch(root) {
  function createGraphSketch(host, initialOptions = {}) {
    if (!root.p5 || !host) return null;
    let options = { drawings: [], frozen: false, referenceVisible: false, mode: 'drawing', tool: 'freehand', ...initialOptions };
    let activeStroke = null;
    let plotStroke = null;

    const sketch = new root.p5(p => {
      const scale = 32;
      const size = () => ({ width: Math.max(1, host.clientWidth), height: Math.max(1, host.clientHeight) });
      const axes = () => { const { width, height } = size(); return { width, height, x: width * 0.44, y: height * 0.58 }; };

      function drawGrid() {
        const { width, height, x, y } = axes();
        p.background('#fbfcfd');
        p.stroke('#dce2e8');
        p.strokeWeight(1);
        for (let gridX = x % scale; gridX < width; gridX += scale) p.line(gridX, 0, gridX, height);
        for (let gridY = y % scale; gridY < height; gridY += scale) p.line(0, gridY, width, gridY);
        p.stroke('#6b737d');
        p.strokeWeight(2);
        p.line(0, y, width, y);
        p.line(x, 0, x, height);
        p.noStroke();
        p.fill('#666b73');
        p.textSize(13);
        p.text('x', width - 18, y + 18);
        p.text('y', x + 8, 16);
      }

      function drawReference() {
        if (!options.referenceVisible || !root.EquationParser) return;
        const graph = root.EquationParser.tryCompile(options.equation);
        if (!graph) return;
        const { width, x: axisX, y: axisY } = axes();
        p.noFill(); p.stroke('#2a8f52'); p.strokeWeight(4); p.beginShape();
        for (let graphX = -axisX / scale; graphX <= (width - axisX) / scale; graphX += 0.05) {
          const graphY = graph.evaluate(graphX);
          if (Number.isFinite(graphY)) p.vertex(axisX + graphX * scale, axisY - graphY * scale);
        }
        p.endShape();
      }

      function drawStroke(stroke) {
        if (!stroke.points.length) return;
        p.stroke(stroke.color || '#244b74');
        p.strokeWeight(4);
        if (stroke.tool === 'point' || stroke.points.length === 1) {
          p.fill(stroke.color || '#244b74');
          p.noStroke();
          p.circle(stroke.points[0].x, stroke.points[0].y, 9);
          return;
        }
        p.noFill();
        if (stroke.tool === 'line') {
          p.line(stroke.points[0].x, stroke.points[0].y, stroke.points[1].x, stroke.points[1].y);
          return;
        }
        p.beginShape();
        stroke.points.forEach(point => p.vertex(point.x, point.y));
        p.endShape();
      }

      function drawStrokes() {
        for (const stroke of options.drawings || []) {
          drawStroke(stroke);
        }
      }

      p.setup = () => {
        const { width, height } = size();
        const canvas = p.createCanvas(width, height);
        canvas.parent(host);
        canvas.elt.classList.add('p5-graph-canvas');
        p.pixelDensity(root.devicePixelRatio || 1);
      };
      p.draw = () => { drawGrid(); drawReference(); drawStrokes(); if (activeStroke) drawStroke(activeStroke); };
      p.mousePressed = () => {
        if (options.mode !== 'drawing' || options.frozen || p.mouseX < 0 || p.mouseY < 0 || p.mouseX > p.width || p.mouseY > p.height) return;
        const color = options.activePlayer === options.challengedPlayer ? '#244b74' : '#b86b1f';
        const point = { x: p.mouseX, y: p.mouseY };
        if (options.tool === 'point') {
          options.onStroke?.({ player: options.activePlayer, color, tool: 'point', points: [point] });
          sketch.redraw();
          return;
        }
        if (options.tool === 'plotter') {
          if (!plotStroke || plotStroke.player !== options.activePlayer) {
            plotStroke = { player: options.activePlayer, color, tool: 'plotter', points: [] };
          }
          plotStroke.points.push(point);
          options.onStroke?.(plotStroke);
          sketch.redraw();
          return;
        }
        activeStroke = { player: options.activePlayer, color, tool: options.tool, points: options.tool === 'line' ? [point, point] : [point] };
      };
      p.mouseDragged = () => { if (activeStroke && activeStroke.tool === 'freehand') activeStroke.points.push({ x: p.mouseX, y: p.mouseY }); else if (activeStroke && activeStroke.tool === 'line') activeStroke.points[1] = { x: p.mouseX, y: p.mouseY }; };
      p.mouseReleased = () => { if (activeStroke) { options.onStroke?.(activeStroke); activeStroke = null; } };
      p.windowResized = () => { const { width, height } = size(); p.resizeCanvas(width, height); };
    });

    return {
      update(nextOptions) {
        if (nextOptions.tool && nextOptions.tool !== options.tool) plotStroke = null;
        if (nextOptions.activePlayer && nextOptions.activePlayer !== options.activePlayer) plotStroke = null;
        options = { ...options, ...nextOptions };
        sketch.redraw();
      },
      clearCurrent() { options.onClear?.(options.activePlayer); sketch.redraw(); },
      undoCurrent() { options.onUndo?.(options.activePlayer); plotStroke = null; sketch.redraw(); },
      remove() { sketch.remove(); }
    };
  }
  root.EquationGraph = { createGraphSketch };
})(typeof window === 'object' ? window : globalThis);
