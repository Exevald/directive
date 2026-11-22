var canvas = document.getElementById("canvas");
var ctx = canvas.getContext("2d");

var editor = {
    color: "#172026",
    size: 10,
    brush: "pencil",
    drawing: false,
    x: 0,
    y: 0,
};

function setColor(color) {
    editor.color = color;
}

function setSize(size) {
    editor.size = Number(size);
    document.getElementById("sizeValue").value = editor.size;
    updateStatus();
}

function selectBrush(name) {
    editor.brush = name;
    document.querySelector(".tool.selected").classList.remove("selected");
    document.querySelector('[data-brush="' + name + '"]').classList.add("selected");
    updateStatus();
}

function brushStroke(x1, y1, x2, y2) {
    if (editor.brush === "pencil") {
        pencil(x1, y1, x2, y2);
    }
    if (editor.brush === "marker") {
        marker(x1, y1, x2, y2);
    }
    if (editor.brush === "spray") {
        spray(x2, y2);
    }
    if (editor.brush === "eraser") {
        eraser(x1, y1, x2, y2);
    }
    if (editor.brush === "myBrush") {
        myBrush(x1, y1, x2, y2);
    }
}

function drawLine(x1, y1, x2, y2) {
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

function drawCircle(x, y, radius) {
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = editor.color;
    ctx.lineWidth = editor.size;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();
}

function fillCircle(x, y, radius) {
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = editor.color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
}

function drawRectangle(x, y, width, height) {
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = editor.color;
    ctx.lineWidth = editor.size;
    ctx.strokeRect(x, y, width, height);
}

function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function downloadImage() {
    var link = document.createElement("a");
    link.download = "my-picture.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
}

canvas.onpointerdown = function (event) {
    editor.drawing = true;
    editor.x = event.offsetX;
    editor.y = event.offsetY;
    canvas.setPointerCapture(event.pointerId);

    if (editor.brush === "spray" || editor.brush === "myBrush") {
        brushStroke(editor.x, editor.y, editor.x, editor.y);
    }
};

canvas.onpointermove = function (event) {
    if (editor.drawing === false) return;

    if (editor.brush === "line" || editor.brush === "circle" || editor.brush === "rectangle") return;

    brushStroke(editor.x, editor.y, event.offsetX, event.offsetY);
    editor.x = event.offsetX;
    editor.y = event.offsetY;
};

canvas.onpointerup = function (event) {
    if (editor.drawing === false) return;

    if (editor.brush === "line") drawLine(editor.x, editor.y, event.offsetX, event.offsetY);

    if (editor.brush === "circle") {
        var dx = event.offsetX - editor.x;
        var dy = event.offsetY - editor.y;
        var radius = Math.sqrt(dx * dx + dy * dy);
        drawCircle(editor.x, editor.y, radius);
    }

    if (editor.brush === "rectangle") {
        drawRectangle(editor.x, editor.y, event.offsetX - editor.x, event.offsetY - editor.y);
    }

    editor.drawing = false;
};

document.getElementById("color").oninput = function () {
    setColor(this.value);
};
document.getElementById("size").oninput = function () {
    setSize(this.value);
};
document.getElementById("clearButton").onclick = clearCanvas;
document.getElementById("downloadButton").onclick = downloadImage;

function updateStatus() {
    document.getElementById("status").textContent = editor.brush + " · " + editor.size + " px";
}
