const fs = require('fs');
const { PNG } = require('pngjs');

fs.createReadStream('لوحة الالوان.png')
  .pipe(new PNG())
  .on('parsed', function() {
    let colors = {};
    for (var y = 0; y < this.height; y++) {
      for (var x = 0; x < this.width; x++) {
        var idx = (this.width * y + x) << 2;
        var r = this.data[idx];
        var g = this.data[idx+1];
        var b = this.data[idx+2];
        var hex = '#' + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1);
        colors[hex] = (colors[hex] || 0) + 1;
      }
    }
    // get top 5 colors
    let top = Object.keys(colors).sort((a, b) => colors[b] - colors[a]).slice(0, 10);
    console.log(top);
  });
