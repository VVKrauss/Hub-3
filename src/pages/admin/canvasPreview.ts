export async function canvasPreview(
  image: HTMLImageElement,
  canvas: HTMLCanvasElement,
  crop: PixelCrop,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('No 2d context');
  }

  // Размеры canvas равны размерам кропа
  canvas.width = crop.width;
  canvas.height = crop.height;

  // Масштабирование для изображения с учетом devicePixelRatio
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  // Координаты и размеры кропа в оригинальных размерах изображения
  const cropX = crop.x * scaleX;
  const cropY = crop.y * scaleY;
  const cropWidth = crop.width * scaleX;
  const cropHeight = crop.height * scaleY;

  // Очищаем canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Рисуем вырезанную часть изображения на canvas
  ctx.drawImage(
    image,
    cropX, cropY,       // Начальные координаты кропа
    cropWidth, cropHeight, // Размеры кропа
    0, 0,              // Начальные координаты на canvas
    crop.width, crop.height // Размеры на canvas
  );
}