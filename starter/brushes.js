function pencil(x1, y1, x2, y2) {
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = editor.color;
    ctx.lineWidth = editor.size;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
}

function marker(x1, y1, x2, y2) {
    ctx.globalAlpha = 0.25;
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = editor.color;
    ctx.lineWidth = editor.size * 2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.globalAlpha = 1;
}

function spray(x, y) {
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = editor.color;

    var i = 0;
    while (i < 30) {
        var dx = Math.random() * editor.size - editor.size / 2;
        var dy = Math.random() * editor.size - editor.size / 2;
        ctx.fillRect(x + dx, y + dy, 2, 2);
        i = i + 1;
    }
}

function eraser(x1, y1, x2, y2) {
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "destination-out";
    ctx.lineWidth = editor.size;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.globalCompositeOperation = "source-over";
}

// Главная творческая задача практикума: измени эту кисть.
// Ею можно рисовать мышью.
function myBrush(x1, y1, x2, y2) {
    ctx.fillStyle = editor.color;
    ctx.beginPath();
    ctx.arc(x2, y2, editor.size, 0, Math.PI * 2);
    ctx.fill();
}
