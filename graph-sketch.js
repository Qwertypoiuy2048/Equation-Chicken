(function attachGraphSketch(root) {
  function createGraphSketch(host, initialOptions = {}) {
    if (!root.p5 || !host) return null;
    let options = { drawings: [], frozen: false, referenceVisible: false, mode: 'drawing', tool: 'freehand', bounds: { xMin: -10, xMax: 10, yMin: -10, yMax: 10 }, ...initialOptions };
    let activeStroke = null;
    let plotStroke = null;

    const sketch = new root.p5(p => {
      const size = () => ({ width: Math.max(1, host.clientWidth), height: Math.max(1, host.clientHeight) });
      const view = () => options.bounds;
      const graphToPixel = point => {
        const { width, height } = size();
        const bounds = view();
        return {
          x: ((point.x - bounds.xMin) / (bounds.xMax - bounds.xMin)) * width,
          y: height - ((point.y - bounds.yMin) / (bounds.yMax - bounds.yMin)) * height
        };
      };
      const pixelToGraph = point => {
        const { width, height } = size();
        const bounds = view();
        return {
          x: bounds.xMin + (point.x / width) * (bounds.xMax - bounds.xMin),
          y: bounds.yMin + ((height - point.y) / height) * (bounds.yMax - bounds.yMin)
        };
      };
      const niceStep = (span, divisions = 10) => {
        const rough = span / divisions;
        const power = 10 ** Math.floor(Math.log10(rough));
        const normalized = rough / power;
        const multiplier = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
        return multiplier * power;
      };
      const squareGridStep = (yStep, bounds, width, height) => {
        const targetXStep = yStep * (bounds.xMax - bounds.xMin) * height / ((bounds.yMax - bounds.yMin) * width);
        return niceStep(targetXStep * 10, 10);
      };
      const tickValues = (minimum, maximum, step) => {
        const values = [];
        for (let value = Math.ceil(minimum / step) * step; value <= maximum + step * 0.001; value += step) values.push(Number(value.toFixed(10)));
        return values;
      };

      function drawGrid() {
        const { width, height } = size();
        const bounds = view();
        const yStep = niceStep(bounds.yMax - bounds.yMin, 10);
        const xStep = squareGridStep(yStep, bounds, width, height);
        p.background('#fbfcfd');
        p.stroke('#dce2e8');
        p.strokeWeight(1);
        for (const value of tickValues(bounds.xMin, bounds.xMax, xStep)) {
          const x = graphToPixel({ x: value, y: 0 }).x;
          p.line(x, 0, x, height);
        }
        for (const value of tickValues(bounds.yMin, bounds.yMax, yStep)) {
          const y = graphToPixel({ x: 0, y: value }).y;
          p.line(0, y, width, y);
        }
        const axisX = bounds.xMin <= 0 && bounds.xMax >= 0 ? graphToPixel({ x: 0, y: 0 }).x : null;
        const axisY = bounds.yMin <= 0 && bounds.yMax >= 0 ? graphToPixel({ x: 0, y: 0 }).y : null;
        p.stroke('#6b737d');
        p.strokeWeight(2);
        if (axisY !== null) p.line(0, axisY, width, axisY);
        if (axisX !== null) p.line(axisX, 0, axisX, height);
        p.noStroke();
        p.fill('#666b73');
        p.textSize(12);
        p.textAlign(p.CENTER, p.TOP);
        for (const value of tickValues(bounds.xMin, bounds.xMax, xStep)) {
          const x = graphToPixel({ x: value, y: 0 }).x;
          p.text(value, x, axisY === null ? height - 20 : Math.min(height - 18, axisY + 8));
        }
        p.textAlign(p.RIGHT, p.CENTER);
        for (const value of tickValues(bounds.yMin, bounds.yMax, yStep)) {
          const y = graphToPixel({ x: 0, y: value }).y;
          p.text(value, axisX === null ? 30 : Math.max(30, axisX - 8), y);
        }
        p.textAlign(p.LEFT, p.BASELINE);
        if (axisY !== null) p.text('x', width - 16, Math.min(height - 4, axisY - 6));
        if (axisX !== null) p.text('y', Math.min(width - 12, axisX + 8), 16);
      }

      function drawReference() {
        if (!options.referenceVisible || !root.EquationParser) return;
        const graph = root.EquationParser.tryCompile(options.equation);
        if (!graph) return;
        const bounds = view();
        p.noFill(); p.stroke('#2a8f52'); p.strokeWeight(4); p.beginShape();
        const step = (bounds.xMax - bounds.xMin) / 400;
        for (let graphX = bounds.xMin; graphX <= bounds.xMax; graphX += step) {
          const graphY = graph.evaluate(graphX);
          if (Number.isFinite(graphY)) {
            const point = graphToPixel({ x: graphX, y: graphY });
            p.vertex(point.x, point.y);
          }
        }
        p.endShape();
      }

      function drawStroke(stroke) {
        if (!stroke.points.length) return;
        p.stroke(stroke.color || '#244b74');
        p.strokeWeight(4);
        const points = stroke.coordinateSpace === 'graph' ? stroke.points.map(graphToPixel) : stroke.points;
        if (stroke.tool === 'point' || stroke.points.length === 1) {
          p.fill(stroke.color || '#244b74');
          p.noStroke();
          p.circle(points[0].x, points[0].y, 9);
          return;
        }
        p.noFill();
        if (stroke.tool === 'line') {
          p.line(points[0].x, points[0].y, points[1].x, points[1].y);
          return;
        }
        p.beginShape();
        points.forEach(point => p.vertex(point.x, point.y));
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
        const point = pixelToGraph({ x: p.mouseX, y: p.mouseY });
        const coordinateSpace = 'graph';
        if (options.tool === 'point') {
          options.onStroke?.({ player: options.activePlayer, color, tool: 'point', coordinateSpace, points: [point] });
          sketch.redraw();
          return;
        }
        if (options.tool === 'plotter') {
          if (!plotStroke || plotStroke.player !== options.activePlayer) {
            plotStroke = { player: options.activePlayer, color, tool: 'plotter', coordinateSpace, points: [] };
          }
          plotStroke.points.push(point);
          options.onStroke?.(plotStroke);
          sketch.redraw();
          return;
        }
        activeStroke = { player: options.activePlayer, color, tool: options.tool, coordinateSpace, points: options.tool === 'line' ? [point, point] : [point] };
      };
      p.mouseDragged = () => {
        if (!activeStroke) return;
        const point = pixelToGraph({ x: p.mouseX, y: p.mouseY });
        if (activeStroke.tool === 'freehand') activeStroke.points.push(point);
        else if (activeStroke.tool === 'line') activeStroke.points[1] = point;
      };
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
      clearCurrent() { options.onClear?.(options.activePlayer); plotStroke = null; sketch.redraw(); },
      undoCurrent() { options.onUndo?.(options.activePlayer); plotStroke = null; sketch.redraw(); },
      remove() { sketch.remove(); }
    };
  }
  root.EquationGraph = { createGraphSketch };
})(typeof window === 'object' ? window : globalThis);
