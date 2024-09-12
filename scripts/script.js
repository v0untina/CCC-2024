document.addEventListener('DOMContentLoaded', function () {
  let canvas = document.getElementById("imageCanvas");
  let ctx = canvas.getContext("2d");
  let hiddenCanvas = document.createElement("canvas");
  let hiddenCtx = hiddenCanvas.getContext("2d");
  let image = new Image();
  let originalImageData = null;
  let history = [];
  let historyStep = -1;
  const MAX_WIDTH = 1110;
  const MAX_HEIGHT = 640;

  // Изначально скрываем canvas
  canvas.style.display = 'none';

  // Функция для обработки загруженных файлов
  function handleFile(file) {
    let reader = new FileReader();
    reader.onload = function (e) {
      image.src = e.target.result;
      image.onload = function () {
        // Устанавливаем размеры canvas
        canvas.width = image.width;
        canvas.height = image.height;
        hiddenCanvas.width = image.width;
        hiddenCanvas.height = image.height;

        // Отображаем изображение на canvas
        ctx.drawImage(image, 0, 0);
        hiddenCtx.drawImage(image, 0, 0);

        originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // Добавляем бордер при загрузке изображения
        canvas.classList.add('canvas-border');
        
        // Показываем canvas
        canvas.style.display = 'block';
        
        // Скрываем текст и бордер в dropArea
        document.getElementById('dropArea').classList.add('hidden');

        saveState();
      };
    };
    reader.readAsDataURL(file);
  }

  // Обработка клика на #dropArea
  document.getElementById("dropArea").addEventListener("click", function () {
    document.getElementById("upload").click();
  });

  // Обработка загрузки файла через кнопку
  document.getElementById("upload").addEventListener("change", function (event) {
    if (event.target.files.length > 0) {
      handleFile(event.target.files[0]);
    }
  });

  // Сохранить текущее состояние
  function saveState() {
    history = history.slice(0, historyStep + 1);
    history.push(canvas.toDataURL());
    historyStep++;
  }

  // Восстановление состояния
  function restoreState(dataUrl) {
    let img = new Image();
    img.src = dataUrl;
    img.onload = function () {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };
  }

  // Отмена действия
  document.getElementById("undoButton").addEventListener("click", function () {
    if (historyStep > 0) {
      historyStep--;
      restoreState(history[historyStep]);
    }
  });

  // Возврат действия
  document.getElementById("redoButton").addEventListener("click", function () {
    if (historyStep < history.length - 1) {
      historyStep++;
      restoreState(history[historyStep]);
    }
  });

  // Сброс к исходному изображению
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

  // Сохранение изображения
  document.getElementById("downloadButton").addEventListener("click", function () {
    let link = document.createElement('a');
    link.download = 'edited-image.png';
    link.href = canvas.toDataURL();
    link.click();
  });

  // Изменение размеров
  document.getElementById("resizeButton").addEventListener("click", function () {
    let newWidth = document.getElementById("resizeWidth").value;
    let newHeight = document.getElementById("resizeHeight").value;
    let keepAspectRatio = document.getElementById("keepAspectRatio").checked;

    newWidth = parseInt(newWidth);
    newHeight = parseInt(newHeight);

    if (isNaN(newWidth) || isNaN(newHeight)) {
      alert("Пожалуйста, введите допустимые размеры.");
      return;
    }

    // Применение максимальных размеров
    if (newWidth > MAX_WIDTH) {
      newWidth = MAX_WIDTH;
    }
    if (newHeight > MAX_HEIGHT) {
      newHeight = MAX_HEIGHT;
    }

    if (keepAspectRatio) {
      let aspectRatio = image.width / image.height;
      if (newWidth / newHeight > aspectRatio) {
        newWidth = newHeight * aspectRatio;
      } else {
        newHeight = newWidth / aspectRatio;
      }
    }
    canvas.width = newWidth;
    canvas.height = newHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let x = 0;
    let y = 0;
    let width = newWidth;
    let height = newHeight;

    if (width > canvas.width) {
      width = canvas.width;
      height = (width / newWidth) * newHeight;
    }

    if (height > canvas.height) {
      height = canvas.height;
      width = (height / newHeight) * newWidth;
    }

    x = (canvas.width - width) / 2;
    y = (canvas.height - height) / 2;

    ctx.drawImage(image, x, y, width, height);
    hiddenCanvas.width = newWidth;
    hiddenCanvas.height = newHeight;
    hiddenCtx.drawImage(image, x, y, width, height);

    saveState();
  });

  // Изменение яркости, контраста, насыщенности
  document.getElementById("brightness").addEventListener("input", applyFilters);
  document.getElementById("contrast").addEventListener("input", applyFilters);
  document.getElementById("saturation").addEventListener("input", applyFilters);

  function applyFilters() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.filter = `brightness(${document.getElementById("brightness").value}%) contrast(${document.getElementById("contrast").value}%) saturate(${document.getElementById("saturation").value}%)`;
    ctx.drawImage(hiddenCanvas, 0, 0);
    saveState();
  }

  // Добавление текста
  document.getElementById("addTextButton").addEventListener("click", function () {
    let text = document.getElementById("textInput").value;
    let color = document.getElementById("textColor").value;
    if (text) {
      ctx.fillStyle = color;
      ctx.font = "30px Arial";
      ctx.fillText(text, 50, 50);
      hiddenCtx.fillStyle = color;
      hiddenCtx.font = "30px Arial";
      hiddenCtx.fillText(text, 50, 50); // Сохраняем текст в скрытый canvas
      saveState();
    }
  });

  // Добавление фигур
  document.getElementById("addCircleButton").addEventListener("click", function () {
    ctx.fillStyle = "rgba(255,0,0,0.5)";
    ctx.beginPath();
    ctx.arc(150, 150, 50, 0, Math.PI * 2);
    ctx.fill();
    hiddenCtx.fillStyle = "rgba(255,0,0,0.5)";
    hiddenCtx.beginPath();
    hiddenCtx.arc(150, 150, 50, 0, Math.PI * 2);
    hiddenCtx.fill();
    saveState();
  });

  document.getElementById("addRectButton").addEventListener("click", function () {
    ctx.fillStyle = "rgba(0,0,255,0.5)";
    ctx.fillRect(200, 200, 100, 50);
    hiddenCtx.fillStyle = "rgba(0,0,255,0.5)";
    hiddenCtx.fillRect(200, 200, 100, 50);
    saveState();
  });

  // Область для перетаскивания
  let dropArea = document.getElementById('dropArea');

  dropArea.addEventListener('dragover', function (e) {
    e.preventDefault();
    e.stopPropagation();
    dropArea.classList.add('dragover');
  });

  dropArea.addEventListener('dragleave', function (e) {
    e.preventDefault();
    e.stopPropagation();
    dropArea.classList.remove('dragover');
  });

  dropArea.addEventListener('drop', function (e) {
    e.preventDefault();
    e.stopPropagation();
    dropArea.classList.remove('dragover');
    dropArea.classList.add('hidden');
    let files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  });

  // Функция для отображения кнопок в правом сайдбаре
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
});
