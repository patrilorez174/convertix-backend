const express = require('express');
const cors = require('cors');
const multer = require('multer');
const sharp = require('sharp');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());

if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');
if (!fs.existsSync('converted')) fs.mkdirSync('converted');

app.use('/descargas', express.static(path.join(__dirname, 'converted')));

const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 25 * 1024 * 1024 }
});

app.post('/api/convert', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se recibió ningún archivo.' });
    }

    const formatoDestino = (req.body.to || 'png').toLowerCase();
    const nombreSalida = `${Date.now()}_convertiX.${formatoDestino}`;
    const rutaSalida = path.join(__dirname, 'converted', nombreSalida);

    // 1. Conversión de imágenes (JPG, PNG, WEBP)
    if (['jpg', 'jpeg', 'png', 'webp'].includes(formatoDestino)) {
      await sharp(req.file.path)
        .toFormat(formatoDestino === 'jpg' ? 'jpeg' : formatoDestino)
        .toFile(rutaSalida);

      fs.unlinkSync(req.file.path);
      setTimeout(() => {
        if (fs.existsSync(rutaSalida)) fs.unlinkSync(rutaSalida);
      }, 3600 * 1000);

      res.json({
        url: `http://localhost:3000/descargas/${nombreSalida}`
      });

    // 2. Conversión de imagen a PDF
    } else if (formatoDestino === 'pdf') {
      const imagenPng = await sharp(req.file.path).png().toBuffer();
      const doc = new PDFDocument({ autoFirstPage: false });
      const stream = fs.createWriteStream(rutaSalida);

      doc.pipe(stream);
      const img = doc.openImage(imagenPng);
      doc.addPage({ size: [img.width, img.height] });
      doc.image(img, 0, 0);
      doc.end();

      stream.on('finish', () => {
        fs.unlinkSync(req.file.path);
        setTimeout(() => {
          if (fs.existsSync(rutaSalida)) fs.unlinkSync(rutaSalida);
        }, 3600 * 1000);

        res.json({
          url: `http://localhost:3000/descargas/${nombreSalida}`
        });
      });

    } else {
      fs.unlinkSync(req.file.path);
      res.status(400).json({ error: 'Por ahora prueba convirtiendo imágenes a PNG, JPG, WEBP o PDF.' });
    }

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al procesar el archivo.' });
  }
});

app.listen(3000, () => {
  console.log('✅ Backend listo en http://localhost:3000');
});
