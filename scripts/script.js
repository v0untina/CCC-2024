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
  let isFlippedHorizontally = false;
  let isFlippedVertically = false;
  let imageX = 0, imageY = 0;


  const activeIcons = {
    crop_button: '/images/crop-active.png',
    resize_button: '/images/resize-active.png',
    rotate_button: '/images/rotate-active.png',
    adjust_button: '/images/adjust-active.png',
    filter_button: '/images/filters-active.png',
    text_button: '/images/text-active.png',
    decorate_button: '/images/decorate-active.png'
  };

  const defaultIcons = {
    crop_button: '/images/crop.png',
    resize_button: '/images/resize.png',
    rotate_button: '/images/rotate.png',
    adjust_button: '/images/adjust.png',
    filter_button: '/images/filters.png',
    text_button: '/images/text.png',
    decorate_button: '/images/decorate.png'
  };

  canvas.style.display = 'none';

  function handleFile(file) {
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
        saveState(); // Save initial state
      };
    };
    reader.readAsDataURL(file);
  }

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
        figures: figures,
        filters: ctx.filter,
        position: { x: imageX, y: imageY }, // Положение изображения
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
      figures = state.figures;
      drawFigures();
    };
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

  function applyFilters() {
    const brightness = document.getElementById("brightness").value;
    const contrast = document.getElementById("contrast").value;
    const saturation = document.getElementById("saturation").value;
    const exposure = document.getElementById("exposure").value;

    const exposureEffect = exposure / 100;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Применение фильтров
    ctx.filter = `brightness(${brightness * exposureEffect}%) contrast(${contrast}%) saturate(${saturation}%)`;
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(currentAngle * Math.PI / 180);
    ctx.scale(isFlippedHorizontally ? -1 : 1, isFlippedVertically ? -1 : 1);
    ctx.drawImage(image, -canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);
    ctx.restore();
    drawFigures();
    saveState();
}



  document.getElementById("redoButton").addEventListener("click", function () {
    if (historyStep < history.length - 1) {
      historyStep++;
      restoreState(history[historyStep]);
    }
  });

  document.getElementById("resetButton").addEventListener("click", function () {
    if (originalImageData) {
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
    rotateImage(0); // Перерисовываем с учетом новых настроек отражения
}


  document.querySelector('.rotate-left').addEventListener('click', function () {
    rotateImage(-90);
  });

  document.querySelector('.rotate-right').addEventListener('click', function () {
    rotateImage(90);
  });

  document.querySelector('.flip-horizontal').addEventListener('click', function () {
    flipImage('horizontal');
  });

  document.querySelector('.flip-vertical').addEventListener('click', function () {
    flipImage('vertical');
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

  function drawFigures() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0); // Отображаем изображение
  
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
        // Проверяем, чтобы прямоугольник не выходил за границы canvas
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
    });
  }
  

  function drawResizeHandles(figure) {
    const size = 10;
    ctx.fillStyle = 'yellow';
    ctx.beginPath();

    if (figure.type === 'circle') {
      // Ручки для круга
      ctx.arc(figure.x + figure.radius, figure.y, size, 0, Math.PI * 2);
      ctx.arc(figure.x - figure.radius, figure.y, size, 0, Math.PI * 2);
      ctx.arc(figure.x, figure.y + figure.radius, size, 0, Math.PI * 2);
      ctx.arc(figure.x, figure.y - figure.radius, size, 0, Math.PI * 2);
    } else if (figure.type === 'rect') {
      // Ручки для прямоугольника
      ctx.arc(figure.x, figure.y, size, 0, Math.PI * 2);
      ctx.arc(figure.x + figure.width, figure.y, size, 0, Math.PI * 2);
      ctx.arc(figure.x, figure.y + figure.height, size, 0, Math.PI * 2);
      ctx.arc(figure.x + figure.width, figure.y + figure.height, size, 0, Math.PI * 2);
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
      x: 200,
      y: 200,
      width: 100,
      height: 50,
      color: "rgba(0,0,255,0.5)"
    };
    figures.push(rect);
    selectedFigure = rect;
    drawFigures();
    saveState();
  });

  function resizeImage(newWidth, newHeight) {
    // Сохранение текущих данных изображения, фильтров, положения, и состояния
    let imgData = canvas.toDataURL();
    let currentState = {
        image: imgData,
        figures: figures,
        filters: ctx.filter,
        position: { x: imageX, y: imageY }, // Положение изображения
        angle: currentAngle,
        isFlippedHorizontally: isFlippedHorizontally,
        isFlippedVertically: isFlippedVertically
    };

    // Перерисовка изображения с новым размером
    canvas.width = newWidth;
    canvas.height = newHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let img = new Image();
    img.src = imgData;
    img.onload = function() {
        // Применение фильтров
        ctx.filter = currentState.filters;
        
        // Восстановление положения и состояния поворота и отражения
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(currentState.angle * Math.PI / 180);
        ctx.scale(currentState.isFlippedHorizontally ? -1 : 1, currentState.isFlippedVertically ? -1 : 1);
        ctx.drawImage(img, -canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);
        ctx.restore();

        // Восстановление и отрисовка фигур
        figures = currentState.figures; // Восстанавливаем фигуры
        drawFigures();
        saveState(); // Сохраняем новое состояние
    };
}


document.getElementById("resizeButton").addEventListener("click", function () {
    let newWidth = document.getElementById("resizeWidth").value;
    let newHeight = document.getElementById("resizeHeight").value;
    let keepAspectRatio = document.getElementById("keepAspectRatio").checked;

    newWidth = parseInt(newWidth);
    newHeight = parseInt(newHeight);
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
});
  


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
      }
    }
    return null;
  }

  function getResizeHandle(x, y) {
    if (selectedFigure) {
      const size = 10;
      if (selectedFigure.type === 'circle') {
        const radius = selectedFigure.radius;
        if ((Math.abs(x - (selectedFigure.x + radius)) <= size && Math.abs(y - selectedFigure.y) <= size) ||
            (Math.abs(x - (selectedFigure.x - radius)) <= size && Math.abs(y - selectedFigure.y) <= size) ||
            (Math.abs(x - selectedFigure.x) <= size && Math.abs(y - (selectedFigure.y + radius)) <= size) ||
            (Math.abs(x - selectedFigure.x) <= size && Math.abs(y - (selectedFigure.y - radius)) <= size)) {
          return 'circle';
        }
      } else if (selectedFigure.type === 'rect') {
        if ((Math.abs(x - selectedFigure.x) <= size && Math.abs(y - selectedFigure.y) <= size) ||
            (Math.abs(x - (selectedFigure.x + selectedFigure.width)) <= size && Math.abs(y - selectedFigure.y) <= size) ||
            (Math.abs(x - selectedFigure.x) <= size && Math.abs(y - (selectedFigure.y + selectedFigure.height)) <= size) ||
            (Math.abs(x - (selectedFigure.x + selectedFigure.width)) <= size && Math.abs(y - (selectedFigure.y + selectedFigure.height)) <= size)) {
          return 'rect';
        }
      }
    }
    return null;
  }

  function resizeFigure(figure, mouseX, mouseY) {
    if (figure.type === 'circle') {
      let dx = mouseX - figure.x;
      let dy = mouseY - figure.y;
      figure.radius = Math.sqrt(dx * dx + dy * dy);
    } else if (figure.type === 'rect') {
      figure.width = mouseX - figure.x;
      figure.height = mouseY - figure.y;
    }
  }
  
  canvas.addEventListener('mousedown', function (e) {
    let mouseX = e.offsetX;
    let mouseY = e.offsetY;
    
    let resizeHandle = getResizeHandle(mouseX, mouseY);
    if (resizeHandle) {
      isDragging = false;
      isResizing = true;
      offsetX = mouseX;
      offsetY = mouseY;
    } else {
      let clickedFigure = getClickedFigure(mouseX, mouseY);
      if (clickedFigure) {
        selectedFigure = clickedFigure;
        isDragging = true;
        offsetX = mouseX - selectedFigure.x;
        offsetY = mouseY - selectedFigure.y;
      } else {
        selectedFigure = null;
      }
    }
    drawFigures();
  });
  
  canvas.addEventListener('mousemove', function (e) {
    if (isDragging && selectedFigure) {
      let mouseX = e.offsetX;
      let mouseY = e.offsetY;
    
      if (selectedFigure.type === 'circle') {
        selectedFigure.x = mouseX - offsetX;
        selectedFigure.y = mouseY - offsetY;
      } else if (selectedFigure.type === 'rect') {
        selectedFigure.x = mouseX - offsetX;
        selectedFigure.y = mouseY - offsetY;
      }
      drawFigures();
    } else if (isResizing && selectedFigure) {
      resizeFigure(selectedFigure, e.offsetX, e.offsetY);
      drawFigures();
    }
  });
  
  canvas.addEventListener('mouseup', function () {
    isDragging = false;
    isResizing = false;
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
  document.getElementById("rotateSettings").addEventListener("click", function () {
    showRightButtons(["rotate"]);
  });
  document.getElementById("filterSettings").addEventListener("click", function () {
    showRightButtons(["filters"]);
  });
});
