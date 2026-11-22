var aiActions = 0;
var aiLimit = 40;

function aiAction(action) {
    if (aiActions >= aiLimit) return false;
    action();
    aiActions = aiActions + 1;
    return true;
}

function aiColor(color) {
    return aiAction(function () {
        setColor(color);
    });
}

function aiSize(size) {
    return aiAction(function () {
        setSize(size);
    });
}

function aiLine(x1, y1, x2, y2) {
    return aiAction(function () {
        drawLine(x1, y1, x2, y2);
    });
}

function aiCircle(x, y, radius) {
    return aiAction(function () {
        drawCircle(x, y, radius);
    });
}

function aiFillCircle(x, y, radius) {
    return aiAction(function () {
        fillCircle(x, y, radius);
    });
}

function aiRectangle(x, y, width, height) {
    return aiAction(function () {
        drawRectangle(x, y, width, height);
    });
}

function aiMyBrush(x1, y1, x2, y2) {
    return aiAction(function () {
        myBrush(x1, y1, x2, y2);
    });
}

function demoAI(prompt) {
    aiActions = 0;

    var night = prompt.toLowerCase().indexOf("ноч") >= 0;
    var winter = prompt.toLowerCase().indexOf("зим") >= 0;

    aiColor(night ? "#172554" : "#87ceeb");
    aiSize(180);
    aiLine(0, 90, 800, 90);
    aiLine(0, 270, 800, 270);

    aiColor(winter ? "#eef8ff" : "#69a84f");
    aiSize(160);
    aiLine(0, 470, 800, 470);

    aiColor("#9a5a35");
    aiSize(12);
    aiRectangle(270, 235, 270, 190);
    aiColor("#c0392b");
    aiLine(250, 245, 405, 135);
    aiLine(405, 135, 560, 245);
    aiLine(250, 245, 560, 245);

    aiColor("#5b3825");
    aiRectangle(370, 325, 70, 100);
    aiColor("#ffe08a");
    aiRectangle(295, 285, 55, 55);
    aiRectangle(465, 285, 55, 55);

    aiColor(night ? "#f8fafc" : "#ffd54f");
    aiFillCircle(670, 105, 45);

    aiColor(winter ? "#ffffff" : "#2f7d32");
    aiSize(7);
    aiMyBrush(130, 360, 130, 360);
    aiMyBrush(170, 390, 170, 390);
    aiMyBrush(620, 380, 620, 380);
    aiMyBrush(690, 410, 690, 410);

}

document.getElementById("demoButton").onclick = function () {
    demoAI("домик");
};
document.getElementById("aiForm").onsubmit = function (event) {
    event.preventDefault();
    var prompt = document.getElementById("aiPrompt").value || "домик";
    demoAI(prompt);
};

// Live reload относится к инфраструктуре: ученик может не изучать этот блок.
var reloadEvents = new EventSource("/api/events");
reloadEvents.onmessage = function () {
    window.location.reload();
};
