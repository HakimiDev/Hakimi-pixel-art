// Hakimi pixel art tool for build games maps ...
const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");
//

const canvasWidth = Number(prompt("Enter the board width:", "20"));
const canvasHeight = Number(prompt("Enter the board height:", "20"));
const pixelSize = Number(prompt("Enter the pixel size:", "25"));

canvas.width = canvasWidth * pixelSize;
canvas.height = canvasHeight * pixelSize;

let images = [];
let isBlocks = [];

const createRect = (x, y, h, w, c) => {
    ctx.fillStyle = c || "black";
    ctx.fillRect(x, y, w, h);
};

const createStorke = (x, y, h, w, c) => {
    ctx.strokeStyle = c || "black";
    ctx.strokeRect(x, y, w, h);
};

const createImage = (src) => {
    const image = new Image();
    image.src = src;
    image.crossOrigin = "Anonymous";
    return image;
};

const drawImage = (image, x, y, height, width) => {
    ctx.drawImage(image, x, y, width, height);
    const img = images.find(e => e.x === x && e.y === y);
    if (!img) images.push({ x, y, src: image.src });
    else if (img.src !== image.src) img.src = image.src;
};

const colorPicker = document.querySelector("#color");
const fillPicker = document.querySelector("#fillcolor");
const strokePicker = document.querySelector("#strokecolor");
const line = document.querySelector("#line");
const isBlock = document.querySelector("#isblock");
const clearButton = document.querySelector("#clear");
const saveButton = document.querySelector("#save");
const downloadButton = document.querySelector("#download");
const filePicker = document.querySelector("#file");
const preview = document.querySelector("#preview");

let bgColor = "#ffffff";
let storkeColor = "#606076";

fillPicker.value = bgColor;
strokePicker.value = storkeColor;

let undoStack = [];
let redoStack = [];
let mousedown = false;
let ctrl = false;

let linePath = [];

function isOnDiagonalOrColOrRow(x, y, x1, y1, x2, y2) {
    if ((x === x1 && y === y1) || (x === x2 && y === y2)) {
        return true; // (x, y) is one of the points
    }

    if (x1 === x2) {
        // Points lie on the same column
        return x === x1 && y >= Math.min(y1, y2) && y <= Math.max(y1, y2);
    }

    if (y1 === y2) {
        // Points lie on the same row
        return y === y1 && x >= Math.min(x1, x2) && x <= Math.max(x1, x2);
    }

    if ((x - x1) / (x2 - x1) === (y - y1) / (y2 - y1)) {
        // Points lie on the same diagonal
        return (
            x >= Math.min(x1, x2) &&
            x <= Math.max(x1, x2) &&
            y >= Math.min(y1, y2) &&
            y <= Math.max(y1, y2)
        );
    }

    return false;
}

let myImage = null;

async function draw(e) {
    const { x, y } = getMousePos(canvas, e);
    const newX = Math.floor(x / pixelSize) * pixelSize;
    const newY = Math.floor(y / pixelSize) * pixelSize;
    const color = colorPicker.value;
    const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);

    if (
        (!ctrl &&
            !areImageDataEqual(undoStack[undoStack.length - 1], snapshot)) ||
        (ctrl && areImageDataEqual(undoStack[undoStack.length - 1], snapshot))
    ) {
        undoStack.push(snapshot);
        redoStack = [];
    }

    if (line.checked) {
        linePath.push({ x: newX, y: newY });
        if (linePath.length == 2) {
            const x1 = linePath[0].x;
            const x2 = linePath[1].x;
            const y1 = linePath[0].y;
            const y2 = linePath[1].y;

            const d = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));

            for (let i = 0; i < Math.floor(canvas.height / pixelSize); i++) {
                for (let j = 0; j < Math.floor(canvas.width / pixelSize); j++) {
                    const x = j * pixelSize;
                    const y = i * pixelSize;
                    if (isOnDiagonalOrColOrRow(x, y, x1, y1, x2, y2)) {
                        if (!myImage)
                            createRect(x, y, pixelSize, pixelSize, color);
                        else
                            drawImage(
                                myImage,
                                x,
                                y,
                                pixelSize,
                                pixelSize
                            );
                        if (isBlock.checked) {
                            const block = isBlocks.find(e => e.x === newX && e.y === newY);
                            if (!block) isBlocks.push({ x: newX, y: newY });
                        }
                    }
                }
            }

            linePath = [];
            return;
        }
        return;
    }

    createRect(newX, newY, pixelSize, pixelSize, bgColor);
    if (ctrl) {
        createStorke(newX, newY, pixelSize, pixelSize, storkeColor);
        images = images.filter(e => e.x !== newX && e.y !== newY);
        isBlocks = isBlocks.filter(e => e.x !== newX && e.y !== newY);
    } else {
        if (!myImage) createRect(newX, newY, pixelSize, pixelSize, color);
        else drawImage(myImage, newX, newY, pixelSize, pixelSize);
        if (isBlock.checked) {
            const block = isBlocks.find(e => e.x === newX && e.y === newY);
            if (!block) isBlocks.push({ x: newX, y: newY });
        }
    }
}

function areImageDataEqual(imageData1, imageData2) {
    if (typeof imageData1 != "object" || typeof imageData2 != "object")
        return false;

    if (
        imageData1.width !== imageData2.width ||
        imageData1.height !== imageData2.height
    ) {
        // Images have different dimensions
        return false;
    }

    const data1 = imageData1.data;
    const data2 = imageData2.data;

    for (let i = 0; i < data1.length; i += 4) {
        if (
            data1[i] !== data2[i] ||
            data1[i + 1] !== data2[i + 1] ||
            data1[i + 2] !== data2[i + 2] ||
            data1[i + 3] !== data2[i + 3]
        ) {
            // Pixel data at index i is different
            const x = (i / 4) % imageData1.width;
            const y = Math.floor(i / (4 * imageData1.width));
            return false;
        }
    }

    // All pixel data is the same
    return true;
}

function undo() {
    if (undoStack.length) {
        redoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
        const currentSpanshot = undoStack.pop();
        ctx.putImageData(currentSpanshot, 0, 0);
    }
}

function redo() {
    if (redoStack.length) {
        undoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
        const currentSpanshot = redoStack.pop();
        ctx.putImageData(currentSpanshot, 0, 0);
    }
}

function getMousePos(canvas, evt) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: evt.clientX - rect.left,
        y: evt.clientY - rect.top,
    };
}

function resetBoard() {
    linePath = [];
    createRect(0, 0, canvas.width, canvas.height, bgColor);
    for (let i = 0; i < Math.floor(canvas.height / 1); i++) {
        for (let j = 0; j < Math.floor(canvas.width / 1); j++) {
            createRect(
                i * pixelSize,
                j * pixelSize,
                pixelSize,
                pixelSize,
                bgColor
            );
            createStorke(
                i * pixelSize,
                j * pixelSize,
                pixelSize,
                pixelSize,
                storkeColor
            );
        }
    }
}

resetBoard();

window.addEventListener("mousedown", (e) => {
    mousedown = true;
    ctrl = e.ctrlKey;
    draw(e);
});

window.addEventListener("mousemove", (e) => {
    if (!mousedown) return;
    draw(e);
});

window.addEventListener("mouseup", (e) => {
    mousedown = false;
    ctrl = e.ctrlKey;
});

window.addEventListener("mouseleave", (e) => {
    mousedown = false;
    ctrl = e.ctrlKey;
});

clearButton.addEventListener("click", () => {
    resetBoard();
});

function getHexColorAtPosition(x, y) {
    const imageData = ctx.getImageData(x, y, 1, 1);
    let data = imageData.data;

    const red = data[0];
    const green = data[1];
    const blue = data[2];

    const hexColor = rgbToHex(red, green, blue);
    return hexColor;
}

function rgbToHex(red, green, blue) {
    const rHex = red.toString(16).padStart(2, "0");
    const gHex = green.toString(16).padStart(2, "0");
    const bHex = blue.toString(16).padStart(2, "0");

    const hexColor = "#" + rHex + gHex + bHex;
    return hexColor;
}

function getMap() {
    // Build your map structure here ...
    const map = [];
    for (let i = 0; i < Math.floor(canvas.height / pixelSize); i++) {
        for (let j = 0; j < Math.floor(canvas.width / pixelSize); j++) {
            map.push({
                x: j * pixelSize,
                y: i * pixelSize,
                size: pixelSize,
                color: getHexColorAtPosition(
                    j * pixelSize + pixelSize / 2,
                    i * pixelSize + pixelSize / 2
                ),
                imageSrc: images.find(e => e.x === j * pixelSize && e.y === i * pixelSize)?.src || null,
                isBlock: typeof isBlocks.find(e => e.x === j * pixelSize && e.y === i * pixelSize) == 'object'
            });
        }
    }
    console.log(map.length);
    return map;
}

saveButton.addEventListener("click", async () => {
    const txt = JSON.stringify(getMap(), 2, 2);
    console.log(txt);
});

downloadButton.addEventListener("click", () => {
    url = canvas
        .toDataURL("image/jpeg")
        .replace("image/jpeg", "image/octet-stream");
    img = new Image().src = url;
    downloadButton.setAttribute("href", url);
    downloadButton.setAttribute("download", `HPX-${Date.now()}.jpeg`);
});

window.addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() == "z" && e.ctrlKey && !e.shiftKey) {
        undo();
    } else if (e.key.toLowerCase() == "z" && e.ctrlKey && e.shiftKey) {
        redo();
    }
});

fillPicker.addEventListener("change", () => {
    bgColor = fillPicker.value;
    resetBoard();
});

strokePicker.addEventListener("change", () => {
    storkeColor = strokePicker.value;
    resetBoard();
});

line.addEventListener("change", () => {
    linePath = [];
});

filePicker.addEventListener("change", (e) => {
    const files = filePicker.files;
    for (const file of files) {
        const reader = new FileReader();
        const image = document.createElement("img");
        image.classList.add("img");

        reader.onload = (e) => {
            image.src = e.target.result;
            preview.append(image);
            image.addEventListener("click", () => {
                for (const i of preview.children) {
                    i.classList.remove("selected");
                }
                image.classList.toggle("selected");
                myImage = createImage(image.src);
            });
        };

        reader.readAsDataURL(file);
    }
});

colorPicker.addEventListener("input", () => {
    myImage = null;
    for (const i of preview.children) {
        i.classList.remove("selected");
    }
});
