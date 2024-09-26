document.addEventListener('DOMContentLoaded', function () {
  const canvas = document.getElementById("imageCanvas");
  const ctx = canvas.getContext("2d");
  const image = new Image();
  let originalImageData = null;
  let history = [];
  let historyStep = -1;
  const MAX_WIDTH = 1110;
  const MAX_HEIGHT = 640;
  let figures = [];
  let selectedFigure = null;
  let isDragging = false;
  let isResizing = false;
  let offsetX, offsetY;
  let lastSlider = null;
  let currentAngle = 0;
  let rotationAngle = 0;
  let isFlippedHorizontally = false;
  let isFlippedVertically = false;
  let imageX = 0, imageY = 0;
  let cropDirection = 'horizontal'; 
  let cropRatio = 1; 
  let texts = [];
  let selectedText = null;
  let isDraggingText = false;
  const errorModalFile = document.getElementById("errorModalFile");
  const closeErrorModalFile = document.getElementById("closeErrorModalFile");
  const leaveButton = document.getElementById('leaveSite');
  const confirmModal = document.getElementById('confirmModal');
  const confirmLeave = document.getElementById('confirmLeave');
  const cancelLeave = document.getElementById('cancelLeave');


  const activeIcons = {
    crop_button: '/images/crop-active.png',
    resize_button: '/images/resize-active.png',
    rotate_button:'/images/rotate-active.png',
    adjust_button: '/images/adjust-active.png',
    filter_button: '/images/filters-active.png',
    text_button: '/images/text-active.png',
    decorate_button: '/images/decorate-active.png'
  };

  const defaultIcons = {
    crop_button: '/images/crop.png',
    resize_button: '/images/resize.png',
    rotate_button:'/images/rotate.png',
    adjust_button: '/images/adjust.png',
    filter_button: '/images/filters.png',
    text_button: '/images/text.png',
    decorate_button: '/images/decorate.png'
  };

  canvas.style.display = 'none';

  function handleFile(file) {
    const allowedExtensions = ['jpeg', 'png'];
    const fileExtension = file.name.split('.').pop().toLowerCase();
    
    if (!allowedExtensions.includes(fileExtension)) {
      errorModalFile.style.display = "block"; // Открываем модальное окно
      return; 
    }

    let reader = new FileReader();
    reader.onload = function (e) {
      image.src = e.target.result;
      image.onload = function () {
        let scale = Math.min(MAX_WIDTH / image.width, MAX_HEIGHT / image.height);
        let newWidth = image.width * scale;
        let newHeight = image.height * scale;

        canvas.width = newWidth;
        canvas.height = newHeight;

        ctx.drawImage(image, 0, 0, newWidth, newHeight);
        originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        canvas.classList.add('canvas-border');
        canvas.style.display = 'block';
        document.getElementById('dropArea').classList.add('hidden');
        saveState(); 
      };
    };
    reader.readAsDataURL(file);
  }
  closeErrorModalFile.addEventListener('click', function () {
    errorModalFile.style.display = "none"; // Закрываем модальное окно
  });

  // Закрытие модального окна при клике вне его
  window.addEventListener('click', function (event) {
    if (event.target === errorModalFile) {
      errorModalFile.style.display = "none"; // Закрываем модальное окно
    }
  });
  function handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer.files.length > 0) {
      handleFile(event.dataTransfer.files[0]);
    }
  }

  function handleDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
  }

  document.getElementById("dropArea").addEventListener("click", function () {
    document.getElementById("upload").click();
  });

  document.getElementById("dropArea").addEventListener("dragover", function (event) {
    event.preventDefault();
    event.stopPropagation();
    this.classList.add("dragover");
  });
  
  document.getElementById("dropArea").addEventListener("dragleave", function () {
    this.classList.remove("dragover");
  });
  
  document.getElementById("dropArea").addEventListener("drop", function () {
    this.classList.remove("dragover");
  });

  document.getElementById("upload").addEventListener("change", function (event) {
    if (event.target.files.length > 0) {
      handleFile(event.target.files[0]);
    }
  });

  document.getElementById("dropArea").addEventListener("drop", handleDrop);
  document.getElementById("dropArea").addEventListener("dragover", handleDragOver);

function saveState() {
    let imageData = canvas.toDataURL();
    let state = {
        image: imageData,
        figures: figures.map(figure => ({ ...figure })), 
        filters: ctx.filter,
        position: { x: imageX, y: imageY }, 
        angle: currentAngle,
        isFlippedHorizontally: isFlippedHorizontally,
        isFlippedVertically: isFlippedVertically
    };
    history = history.slice(0, historyStep + 1);
    history.push(state);
    historyStep = history.length - 1;
}

function restoreState(state) {
  let img = new Image();
  img.src = state.image;
  img.onload = function () {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      ctx.filter = state.filters; 
      figures = state.figures; 
      drawFigures();
  };
}

  document.querySelector('.crop_ratio').addEventListener('change', function () {
    const selectedRatio = this.value;
    if (selectedRatio === "1") {
      cropRatio = 1; // 1:1
    } else if (selectedRatio === "2") {
      cropRatio = 16 / 9; // 16:9
    } else if (selectedRatio === "3") {
      cropRatio = 4 / 3; // 4:3
    }
  });
  document.querySelector('.horizontal').addEventListener('click', function () {
    cropDirection = 'horizontal';
  });

  document.querySelector('.vertical').addEventListener('click', function () {
    cropDirection = 'vertical';
  });

  document.querySelector('.save_crop-button').addEventListener('click', function () {
    cropImage();
    saveState(); 
  });

  function cropImage() {
    let canvasWidth = canvas.width;
    let canvasHeight = canvas.height;

    let newWidth, newHeight;

    if (cropDirection === 'horizontal') {
        newWidth = canvasWidth;
        newHeight = canvasWidth / cropRatio;
        if (newHeight > canvasHeight) {
            newHeight = canvasHeight;
            newWidth = newHeight * cropRatio;
        }
    } else {
        newHeight = canvasHeight;
        newWidth = canvasHeight / cropRatio;
        if (newWidth > canvasWidth) {
            newWidth = canvasWidth;
            newHeight = newWidth * cropRatio;
        }
    }

    let imgData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
    let currentState = {
        image: imgData,
        figures: figures,
        texts: texts
    };

    const croppedImage = ctx.getImageData((canvasWidth - newWidth) / 2, (canvasHeight - newHeight) / 2, newWidth, newHeight);
    
    canvas.width = newWidth;
    canvas.height = newHeight;

    ctx.putImageData(croppedImage, 0, 0);

    figures = currentState.figures.map(figure => {
        if (figure.type === 'circle') {
            if (isWithinCropArea(figure, (canvasWidth - newWidth) / 2, (canvasHeight - newHeight) / 2, newWidth, newHeight)) {
                return {
                    ...figure,
                    x: (figure.x - (canvasWidth - newWidth) / 2) * (newWidth / canvasWidth),
                    y: (figure.y - (canvasHeight - newHeight) / 2) * (newHeight / canvasHeight),
                    radius: figure.radius * Math.min(newWidth / canvasWidth, newHeight / canvasHeight)
                };
            } else {
                return null; 
            }
        } else if (figure.type === 'rect') {
            if (isWithinCropArea(figure, (canvasWidth - newWidth) / 2, (canvasHeight - newHeight) / 2, newWidth, newHeight)) {
                return {
                    ...figure,
                    x: (figure.x - (canvasWidth - newWidth) / 2) * (newWidth / canvasWidth),
                    y: (figure.y - (canvasHeight - newHeight) / 2) * (newHeight / canvasHeight),
                    width: figure.width * (newWidth / canvasWidth),
                    height: figure.height * (newHeight / canvasHeight)
                };
            } else {
                return null; 
            }
        } else if (figure.type === 'line') {
            if (isWithinCropArea(figure, (canvasWidth - newWidth) / 2, (canvasHeight - newHeight) / 2, newWidth, newHeight)) {
                return {
                    ...figure,
                    x1: (figure.x1 - (canvasWidth - newWidth) / 2) * (newWidth / canvasWidth),
                    y1: (figure.y1 - (canvasHeight - newHeight) / 2) * (newHeight / canvasHeight),
                    x2: (figure.x2 - (canvasWidth - newWidth) / 2) * (newWidth / canvasWidth),
                    y2: (figure.y2 - (canvasHeight - newHeight) / 2) * (newHeight / canvasHeight)
                };
            } else {
                return null;
            }
        }
    }).filter(figure => figure !== null);

    texts = currentState.texts.map(text => ({
        ...text,
        x: (text.x - (canvasWidth - newWidth) / 2) * (newWidth / canvasWidth),
        y: (text.y - (canvasHeight - newHeight) / 2) * (newHeight / canvasHeight),
        size: text.size * Math.min(newWidth / canvasWidth, newHeight / canvasHeight)
    }));
    drawFigures();
    saveState();
}

function isWithinCropArea(figure, cropX, cropY, cropWidth, cropHeight) {
  if (figure.type === 'circle') {
      let circleX = figure.x;
      let circleY = figure.y;
      let radius = figure.radius;
      return (circleX + radius > cropX && circleX - radius < cropX + cropWidth &&
              circleY + radius > cropY && circleY - radius < cropY + cropHeight);
  } else if (figure.type === 'rect') {
      return (figure.x + figure.width > cropX && figure.x < cropX + cropWidth &&
              figure.y + figure.height > cropY && figure.y < cropY + cropHeight);
  } else if (figure.type === 'line') {
      return (
          (figure.x1 > cropX && figure.x1 < cropX + cropWidth && figure.y1 > cropY && figure.y1 < cropY + cropHeight) ||
          (figure.x2 > cropX && figure.x2 < cropX + cropWidth && figure.y2 > cropY && figure.y2 < cropY + cropHeight)
      );
  }
  return false;
}


  
  document.querySelector('.none_filter').addEventListener('click', function() {
    applyImageFilter('none');
  });
  
  document.querySelector('.sepia_filter').addEventListener('click', function() {
      applyImageFilter('grayscale');
  });
  
  document.querySelector('.bandw_filter').addEventListener('click', function() {
      applyImageFilter('sepia');
  });
  
  document.querySelector('.vintage_filter').addEventListener('click', function() {
      applyImageFilter('vintage');
  });

  function applyImageFilter(filterType) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.filter = getFilterCSS(filterType);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    drawFigures();
    saveState();
  }

  function getFilterCSS(filterType) {
    switch (filterType) {
      case 'none':
        return 'none';
      case 'sepia':
        return 'sepia(100%)';
      case 'grayscale':
        return 'grayscale(100%)';
      case 'vintage':
        return 'sepia(50%) contrast(85%) saturate(120%)';
      default:
        return 'none';
    }
  }

  document.getElementById("undoButton").addEventListener("click", function () {
    if (historyStep > 0) {
        historyStep--;
        restoreState(history[historyStep]);
        
        // Сбросим lastSlider, если это необходимо
        if (lastSlider) {
            document.getElementById(lastSlider).value = 100;
            applyFilters();
        }
    }
});


  document.getElementById("brightness").addEventListener("input", applyFilters);
  document.getElementById("contrast").addEventListener("input", applyFilters);
  document.getElementById("saturation").addEventListener("input", applyFilters);
  document.getElementById("exposure").addEventListener("input", applyFilters);
  document.getElementById("temperature").addEventListener("input", applyFilters);
  document.getElementById("customTemperature").addEventListener("input", applyFilters);

  document.getElementById("temperature").addEventListener("input", function() {
    const temperatureValue = this.value;
    document.getElementById("customTemperature").value = temperatureValue;
    applyFilters(); 
});

document.getElementById("customTemperature").addEventListener("input", function() {
    const customTemperatureValue = this.value;
    document.getElementById("temperature").value = customTemperatureValue;
    applyFilters(); 
});

function applyFilters() {
    const brightness = document.getElementById("brightness").value;
    const contrast = document.getElementById("contrast").value;
    const saturation = document.getElementById("saturation").value;
    const exposure = document.getElementById("exposure").value;
  
    const temperatureSlider = document.getElementById("temperature");
    const customTemperatureInput = document.getElementById("customTemperature");
    
    const temperature = temperatureSlider.value || customTemperatureInput.value;

    const exposureEffect = exposure / 100;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
  
    ctx.filter = `brightness(${brightness * exposureEffect}%) contrast(${contrast}%) saturate(${saturation}%)`;
  
    const kelvinToRGB = kelvinToColor(temperature);
  
    ctx.filter += ` sepia(${kelvinToRGB.sepia}%)`;
  
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(currentAngle * Math.PI / 180);
    ctx.scale(isFlippedHorizontally ? -1 : 1, isFlippedVertically ? -1 : 1);
    ctx.drawImage(image, -canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);
    ctx.restore();
  
    drawFigures();
    saveState();
}

  function kelvinToColor(kelvin) {
    let sepiaValue = 0;
  
    // Преобразуем значение температуры в эффект сепии
    if (kelvin < 6500) {
      sepiaValue = (6500 - kelvin) / 65; // Становится "теплее"
    } else {
      sepiaValue = -(kelvin - 6500) / 65; // Становится "холоднее"
    }
  
    // Ограничиваем значения от 0 до 100
    sepiaValue = Math.max(0, Math.min(100, sepiaValue));
  
    return {
      sepia: sepiaValue
    };
  }

  document.getElementById("redoButton").addEventListener("click", function () {
    if (historyStep < history.length - 1) {
      historyStep++;
      restoreState(history[historyStep]);
    }
  });

  document.getElementById("resetButton").addEventListener("click", function () {
    if (originalImageData) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      canvas.width = originalImageData.width;
      canvas.height = originalImageData.height;
      ctx.putImageData(originalImageData, 0, 0);
      hiddenCanvas.width = originalImageData.width;
      hiddenCanvas.height = originalImageData.height;
      hiddenCtx.putImageData(originalImageData, 0, 0);
      ctx.filter = "none";
      saveState();
    }
  });

  document.getElementById("brightness").addEventListener("input", function() {
    lastSlider = "brightness";
    applyFilters();
  });
  document.getElementById("contrast").addEventListener("input", function() {
    lastSlider = "contrast";
    applyFilters();
  });
  document.getElementById("saturation").addEventListener("input", function() {
    lastSlider = "saturation";
    applyFilters();
  });
  document.getElementById("exposure").addEventListener("input", function() {
    lastSlider = "exposure";
    applyFilters();
  });

  
  document.getElementById("downloadButton").addEventListener("click", function () {
    let link = document.createElement('a');
    link.download = 'edited-image.png';
    link.href = canvas.toDataURL();
    link.click();
  });

  function showColorInfo() {
    const colorInfo = document.getElementById("colorInfo");
    colorInfo.style.display = "block";
  }

  document.getElementById("colorPicker").addEventListener("input", function () {
    if (selectedFigure) {
      selectedFigure.color = this.value;
      drawFigures();
    }
  });

  document.getElementById('addTextButton').addEventListener('click', function() {
    const textValue = prompt('Enter text:');
    if (!textValue) return;

    const font = document.getElementById('fontSelect').value;
    const size = document.getElementById('sizeSelect').value;
    const color = document.getElementById('colorPickerFont').value;

    let text = {
        type: 'text',
        x: 100,
        y: 100,
        text: textValue,
        font: font,
        size: size,
        color: color
    };
    
    texts.push(text);
    selectedText = text;
    drawFigures();
    saveState();
});
  

function drawFigures() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0);

  figures.forEach(figure => {
      ctx.fillStyle = figure.color;
      ctx.beginPath();

      if (figure.type === 'circle') {
          ctx.arc(figure.x, figure.y, figure.radius, 0, Math.PI * 2);
          ctx.fill();
          if (figure === selectedFigure) {
              ctx.strokeStyle = 'yellow';
              ctx.lineWidth = 3;
              ctx.stroke();
              drawResizeHandles(figure);
          }
      } else if (figure.type === 'rect') {
          if (figure.x < 0) figure.x = 0;
          if (figure.y < 0) figure.y = 0;
          if (figure.x + figure.width > canvas.width) figure.width = canvas.width - figure.x;
          if (figure.y + figure.height > canvas.height) figure.height = canvas.height - figure.y;

          ctx.fillRect(figure.x, figure.y, figure.width, figure.height);
          if (figure === selectedFigure) {
              ctx.strokeStyle = 'yellow';
              ctx.lineWidth = 3;
              ctx.strokeRect(figure.x, figure.y, figure.width, figure.height);
              drawResizeHandles(figure);
          }
      }
     else if (figure.type === 'line') {
      ctx.moveTo(figure.x1, figure.y1);  // Начальная точка линии
      ctx.lineTo(figure.x2, figure.y2);  // Конечная точка линии
      ctx.strokeStyle = figure.color;
      ctx.lineWidth = figure.borderSize  // Толщина линии
      ctx.stroke();

      // Если линия выбрана
      if (figure === selectedFigure) {
          ctx.stroke();  
          drawResizeHandles(figure);  // Рисуем resize handles на концах линии
      }
  }
});

  texts.forEach(text => {
      ctx.font = `${text.size}px ${text.font}`;
      ctx.fillStyle = text.color;
      ctx.fillText(text.text, text.x, text.y);
      
      const textMetrics = ctx.measureText(text.text);
      const textWidth = textMetrics.width;
      const textHeight = text.size;

      if (text === selectedText) {
          ctx.strokeStyle = 'yellow';
          ctx.lineWidth = 3;
          ctx.strokeRect(text.x, text.y - textHeight, textWidth, textHeight);
          drawTextResizeHandles(text);
      }
  });
}

document.getElementById('borderSizeSlider').addEventListener('input', function() {
  if (selectedFigure && selectedFigure.type === 'line') {
    selectedFigure.borderSize = this.value;  
    drawFigures(); 
  }
});

function drawTextResizeHandles(text) {
  const size = 10; 
  const textMetrics = ctx.measureText(text.text);
  const textWidth = textMetrics.width;
  const textHeight = text.size;

  ctx.fillStyle = 'yellow';
  ctx.beginPath();
  

  ctx.rect(text.x - size / 2, text.y - textHeight - size / 2, size, size); 
  ctx.rect(text.x + textWidth - size / 2, text.y - textHeight - size / 2, size, size); 
  ctx.rect(text.x - size / 2, text.y - size / 2, size, size); 
  ctx.rect(text.x + textWidth - size / 2, text.y - size / 2, size, size); 
  ctx.fill();
}

document.getElementById('fontSelect').addEventListener('change', function() {
  if (selectedText) {
      selectedText.font = this.value;
      drawFigures();
  }
});

document.getElementById('sizeSelect').addEventListener('change', function() {
  if (selectedText) {
      selectedText.size = this.value;
      drawFigures();
  }
});

document.getElementById('colorPickerFont').addEventListener('input', function() {
  if (selectedText) {
      selectedText.color = this.value;
      drawFigures();
  }
});

function drawResizeHandles(figure) {
  const size = 10; 
  const offset = 10; 

  ctx.fillStyle = 'yellow';
  ctx.beginPath();

  if (figure.type === 'circle') {
    const points = [
        { x: figure.x + figure.radius, y: figure.y }, 
        { x: figure.x - figure.radius, y: figure.y }, 
        { x: figure.x, y: figure.y + figure.radius }, 
        { x: figure.x, y: figure.y - figure.radius }  
    ];
    
    points.forEach(point => {
        ctx.rect(point.x - size / 2, point.y - size / 2, size, size);
    });
  } else if (figure.type === 'rect') {
      ctx.rect(figure.x - offset, figure.y - offset, size, size); 
      ctx.rect(figure.x + figure.width - size + offset, figure.y - offset, size, size); 
      ctx.rect(figure.x - offset, figure.y + figure.height - size + offset, size, size); 
      ctx.rect(figure.x + figure.width - size + offset, figure.y + figure.height - size + offset, size, size); 
  } else if (figure.type === 'line') {
      // Рисуем обработчики на концах линии
      ctx.rect(figure.x1 - size / 2, figure.y1 - size / 2, size, size); // Начало линии
      ctx.rect(figure.x2 - size / 2, figure.y2 - size / 2, size, size); // Конец линии
  }

  ctx.fill();
}


document.getElementById("addCircleButton").addEventListener("click", function () {
  showColorInfo();
  let circle = {
      type: 'circle',
      x: 150,
      y: 150,
      radius: 50,
      color: "rgba(255,0,0,0.5)"
  };
  figures.push(circle);
  selectedFigure = circle;
  drawFigures();
  saveState();
});

document.getElementById("addRectButton").addEventListener("click", function () {
  showColorInfo();
  let rect = {
      type: 'rect',
      x: 200,// Начальная точка по X
      y: 200,// Начальная точка по Y
      width: 100,// Конечная точка по X
      height: 50,// Конечная точка по Y
      color: "rgba(0,0,255,0.5)"
  };
  figures.push(rect);
  selectedFigure = rect;
  drawFigures();
  saveState();
});

document.getElementById("addLineButton").addEventListener("click", function () {
  showColorInfo();
  let line = {
      type: 'line',
      x1: 100, // Начальная точка по X
      y1: 100, // Начальная точка по Y
      x2: 200, // Конечная точка по X
      y2: 200, // Конечная точка по Y
      color: "rgba(0,0,255,0.5)", 
      borderSize: 3 
  };
  figures.push(line);
  selectedFigure = line;
  drawFigures();
  saveState();
});

  function resizeImage(newWidth, newHeight) {
    let imgData = canvas.toDataURL();
    let currentState = {
        image: imgData,
        figures: figures,
        filters: ctx.filter,
        position: { x: imageX, y: imageY }, 
        angle: currentAngle,
        isFlippedHorizontally: isFlippedHorizontally,
        isFlippedVertically: isFlippedVertically
    };

    canvas.width = newWidth;
    canvas.height = newHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let img = new Image();
    img.src = imgData;
    img.onload = function() {
        ctx.filter = currentState.filters;
        
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(currentState.angle * Math.PI / 180);
        ctx.scale(currentState.isFlippedHorizontally ? -1 : 1, currentState.isFlippedVertically ? -1 : 1);
        ctx.drawImage(img, -canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);
        ctx.restore();

        figures = currentState.figures.map(figure => {
            if (figure.type === 'circle') {
                return {
                    ...figure,
                    x: figure.x * (newWidth / canvas.width),
                    y: figure.y * (newHeight / canvas.height),
                    radius: figure.radius * Math.min(newWidth / canvas.width, newHeight / canvas.height)
                };
            } else if (figure.type === 'rect') {
                return {
                    ...figure,
                    x: figure.x * (newWidth / canvas.width),
                    y: figure.y * (newHeight / canvas.height),
                    width: figure.width * (newWidth / canvas.width),
                    height: figure.height * (newHeight / canvas.height)
                };
            }
        });

        texts = texts.map(text => ({
            ...text,
            x: text.x * (newWidth / canvas.width),
            y: text.y * (newHeight / canvas.height),
            size: text.size * Math.min(newWidth / canvas.width, newHeight / canvas.height)
        }));

        drawFigures();
        saveState(); 
    };
}

function rotateImage(angle) {
  currentAngle = (currentAngle + angle) % 360;
  const rad = (currentAngle * Math.PI) / 180;
  const scaleX = isFlippedHorizontally ? -1 : 1;
  const scaleY = isFlippedVertically ? -1 : 1;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(rad);
  ctx.scale(scaleX, scaleY);
  ctx.drawImage(image, -canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);
  ctx.restore();
  saveState();
}
function flipImage(direction) {
  if (direction === 'horizontal') {
      isFlippedHorizontally = !isFlippedHorizontally;
  } else if (direction === 'vertical') {
      isFlippedVertically = !isFlippedVertically;
  }
  rotateImage(0);
  saveState();
}
document.querySelector('.rotate-left').addEventListener('click', function () {
  rotateImage(-90);
  saveState()
});
document.querySelector('.rotate-right').addEventListener('click', function () {
  rotateImage(90);
  saveState()
});
document.querySelector('.rotate-left-45').addEventListener('click', function () {
  rotateImage(-45);
  saveState()
});
document.querySelector('.rotate-right-45').addEventListener('click', function () {
  rotateImage(45);
  saveState()
});
document.querySelector('.flip-horizontal').addEventListener('click', function () {
  flipImage('horizontal');
  saveState()
});
document.querySelector('.flip-vertical').addEventListener('click', function () {
  flipImage('vertical');
  saveState()
});

const addLineButton = document.getElementById('addLineButton');
const editLine = document.getElementById('editLine');

addLineButton.addEventListener('click', () => {
  editLine.style.display = 'block';
});

document.getElementById('rotate-custom').addEventListener('click', function () {
  const customAngle = parseFloat(document.getElementById('customAngle').value);
  if (!isNaN(customAngle)) {
      // Ограничение угла произвольного поворота
      if (customAngle > 180) {
          customAngle = 180;
      } else if (customAngle < -180) {
          customAngle = -180;
      }
      rotateImage(customAngle);
      saveState();
  }
});

document.getElementById("resizeButton").addEventListener("click", function () {
  let widthInput = document.getElementById("resizeWidth");
  let heightInput = document.getElementById("resizeHeight");
  let newWidth = widthInput.value;
  let newHeight = heightInput.value;
  let keepAspectRatio = document.getElementById("keepAspectRatio").checked;

  widthInput.classList.remove("input-error");
  heightInput.classList.remove("input-error");

  let hasError = false;
  if (newWidth === "") {
      widthInput.classList.add("input-error");
      hasError = true;
  }
  if (newHeight === "") {
      heightInput.classList.add("input-error");
      hasError = true;
  }

  if (hasError) {
      let modal = document.getElementById("errorModal");
      modal.style.display = "block";
      return; 
  }

  newWidth = parseInt(newWidth);
  newHeight = parseInt(newHeight);

  if (isNaN(newWidth) || isNaN(newHeight)) {
      document.getElementById("errorMessage").textContent = "Пожалуйста, введите корректные числовые значения для ширины и высоты.";
      let modal = document.getElementById("errorModal");
      modal.style.display = "block";
      return;
  }

  if (newWidth > MAX_WIDTH) {
      newWidth = MAX_WIDTH;
  }
  if (newHeight > MAX_HEIGHT) {
      newHeight = MAX_HEIGHT;
  }

  if (keepAspectRatio) {
      let aspectRatio = canvas.width / canvas.height;
      if (newWidth / newHeight > aspectRatio) {
          newWidth = newHeight * aspectRatio;
      } else {
          newHeight = newWidth / aspectRatio;
      }
  }

  resizeImage(newWidth, newHeight);
  saveState();
});

document.querySelector(".close").addEventListener("click", function () {
  document.getElementById("errorModal").style.display = "none";
});

window.addEventListener("click", function(event) {
  let modal = document.getElementById("errorModal");
  if (event.target === modal) {
      modal.style.display = "none";
  }
});

function isPointOnLine(x, y, x1, y1, x2, y2, threshold = 5) {
  const distToStart = Math.sqrt((x - x1) ** 2 + (y - y1) ** 2);
  const distToEnd = Math.sqrt((x - x2) ** 2 + (y - y2) ** 2);
  const lineLength = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  return Math.abs(distToStart + distToEnd - lineLength) <= threshold;
}

function getClickedFigure(x, y) {
  for (let i = figures.length - 1; i >= 0; i--) {
      let figure = figures[i];
      if (figure.type === 'circle') {
          let distance = Math.sqrt((x - figure.x) ** 2 + (y - figure.y) ** 2);
          if (distance <= figure.radius) {
              return figure;
          }
      } else if (figure.type === 'rect') {
          if (x >= figure.x && x <= figure.x + figure.width &&
              y >= figure.y && y <= figure.y + figure.height) {
              return figure;
          }
      } else if (figure.type === 'line') {
        if (isPointOnLine(x, y, figure.x1, figure.y1, figure.x2, figure.y2)) {
            return figure;
        }
      }
  }
  return null;
}

function getResizeHandle(x, y) {
  const size = 10;
  const lineBorderPadding = 5;

  if (selectedFigure) {
    if (selectedFigure.type === 'circle') {
      const radius = selectedFigure.radius;
      if (
        (Math.abs(x - (selectedFigure.x + radius)) <= size && Math.abs(y - selectedFigure.y) <= size) ||
        (Math.abs(x - (selectedFigure.x - radius)) <= size && Math.abs(y - selectedFigure.y) <= size) ||
        (Math.abs(x - selectedFigure.x) <= size && Math.abs(y - (selectedFigure.y + radius)) <= size) ||
        (Math.abs(x - selectedFigure.x) <= size && Math.abs(y - (selectedFigure.y - radius)) <= size)
      ) {
        return 'circle';
      }
    } else if (selectedFigure.type === 'rect') {
      if (
        (Math.abs(x - selectedFigure.x) <= size && Math.abs(y - selectedFigure.y) <= size) ||
        (Math.abs(x - (selectedFigure.x + selectedFigure.width)) <= size && Math.abs(y - selectedFigure.y) <= size) ||
        (Math.abs(x - selectedFigure.x) <= size && Math.abs(y - (selectedFigure.y + selectedFigure.height)) <= size) ||
        (Math.abs(x - (selectedFigure.x + selectedFigure.width)) <= size && Math.abs(y - (selectedFigure.y + selectedFigure.height)) <= size)
      ) {
        return 'rect';
      }
    } else if (selectedFigure.type === 'line') {
      // Проверяем попадание в начало или конец линии
      if (
        (Math.abs(x - selectedFigure.x1) <= size && Math.abs(y - selectedFigure.y1) <= size)
      ) {
        return 'line-start';
      }
      if (
        (Math.abs(x - selectedFigure.x2) <= size && Math.abs(y - selectedFigure.y2) <= size)
      ) {
        return 'line-end';
      }
    }
  }
  return null;
}

  function resizeFigure(figure, mouseX, mouseY, handleType) {
    if (figure.type === 'circle') {
        let dx = mouseX - figure.x;
        let dy = mouseY - figure.y;
        figure.radius = Math.sqrt(dx * dx + dy * dy);

    } else if (figure.type === 'rect') {
        figure.width = mouseX - figure.x;
        figure.height = mouseY - figure.y;

        if (figure.width < 0) {
            figure.x += figure.width;
            figure.width = -figure.width;
        }
        if (figure.height < 0) {
            figure.y += figure.height;
            figure.height = -figure.height;
        }

    } else if (figure.type === 'line') {
        // Изменение координат концов линии
        if (handleType === 'line-start') {
            figure.x1 = mouseX;
            figure.y1 = mouseY;
        } else if (handleType === 'line-end') {
            figure.x2 = mouseX;
            figure.y2 = mouseY;
        }
    }
}
  
canvas.addEventListener('mousedown', function(e) {
  let mouseX = e.offsetX;
  let mouseY = e.offsetY;

  let resizeHandle = getResizeHandle(mouseX, mouseY);
  if (resizeHandle) {
      isDragging = false;
      isResizing = true;
      offsetX = mouseX;
      offsetY = mouseY;
      handleType = resizeHandle;
  } else {
      let clickedFigure = getClickedFigure(mouseX, mouseY);
      if (clickedFigure) {
          selectedFigure = clickedFigure;
          isDragging = true;
          offsetX = mouseX - (selectedFigure.type === 'line' ? selectedFigure.x1 : selectedFigure.x);
          offsetY = mouseY - (selectedFigure.type === 'line' ? selectedFigure.y1 : selectedFigure.y);
      } else {
          selectedFigure = null;
      }

      let textSelected = false;
      texts.forEach(text => {
          const textMetrics = ctx.measureText(text.text);
          const textWidth = textMetrics.width;
          const textHeight = text.size;
          
          if (mouseX > text.x && mouseX < text.x + textWidth && mouseY > text.y - textHeight && mouseY < text.y) {
              isDraggingText = true;
              selectedText = text;
              offsetX = mouseX - text.x;
              offsetY = mouseY - text.y;
              textSelected = true;
          }
      });
      
      if (!textSelected && !clickedFigure) {
          isDraggingText = false;
          selectedText = null;
      }
  }
  drawFigures();
});

canvas.addEventListener('mousemove', function(e) {
if (isDraggingText && selectedText) {
    selectedText.x = e.offsetX - offsetX;
    selectedText.y = e.offsetY - offsetY;
    drawFigures();
} else if (isDragging && selectedFigure) {
    let mouseX = e.offsetX;
    let mouseY = e.offsetY;

    if (selectedFigure.type === 'circle') {
        selectedFigure.x = mouseX - offsetX;
        selectedFigure.y = mouseY - offsetY;
    } else if (selectedFigure.type === 'rect') {
        selectedFigure.x = mouseX - offsetX;
        selectedFigure.y = mouseY - offsetY;
    } else if (selectedFigure.type === 'line') {
        let dx = mouseX - offsetX;
        let dy = mouseY - offsetY;
        let diffX = selectedFigure.x2 - selectedFigure.x1;
        let diffY = selectedFigure.y2 - selectedFigure.y1;

        selectedFigure.x1 = dx;
        selectedFigure.y1 = dy;
        selectedFigure.x2 = dx + diffX;
        selectedFigure.y2 = dy + diffY;
    }
    drawFigures();
} else if (isResizing && selectedFigure) {
    resizeFigure(selectedFigure, e.offsetX, e.offsetY, handleType);
    drawFigures();
}
});

canvas.addEventListener('mouseup', function () {
isDragging = false;
isResizing = false;
isDraggingText = false;
saveState();
});
  
  const buttons = document.querySelectorAll('.crop_button, .resize_button, .rotate_button, .adjust_button, .filter_button, .text_button, .decorate_button');

  buttons.forEach(button => {
    button.addEventListener('click', function () {
      buttons.forEach(btn => {
        btn.classList.remove('active');
        const icon = btn.querySelector('img');
        icon.src = defaultIcons[btn.classList[0]];
      });
      this.classList.add('active');

      const icon = this.querySelector('img');
      icon.src = activeIcons[this.classList[0]];
    });
  });

  function showRightButtons(buttonIds) {
    document.querySelectorAll('.right-sidebar > div').forEach(div => {
      div.classList.add('hidden');
    });
    buttonIds.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.classList.remove('hidden');
      }
    });
  }

  leaveButton.addEventListener('click', function() {
    confirmModal.style.display = 'block';
  });

  confirmLeave.addEventListener('click', function() {
    confirmModal.style.display = 'none';
    window.close();
  });

  cancelLeave.addEventListener('click', function() {
    confirmModal.style.display = 'none';
  });

  window.onclick = function(event) {
    if (event.target == confirmModal) {
      confirmModal.style.display = 'none';
    }
  }

  document.getElementById("resizeSettings").addEventListener("click", function () {
    showRightButtons(["resizeInput"]);
  });

  document.getElementById("adjustSettings").addEventListener("click", function () {
    showRightButtons(["adjusts"]);
  });

  document.getElementById("textSettings").addEventListener("click", function () {
    showRightButtons(["text"]);
  });

  document.getElementById("decorateSettings").addEventListener("click", function () {
    showRightButtons(["decorate"]);
  });

  document.getElementById("cropSettings").addEventListener("click", function () {
    showRightButtons(["crop"]);
  });

  document.getElementById("filterSettings").addEventListener("click", function () {
    showRightButtons(["filters"]);
  });
  
  document.getElementById("rotateSettings").addEventListener("click",function(){
    showRightButtons(["rotate"]);
  })
});
