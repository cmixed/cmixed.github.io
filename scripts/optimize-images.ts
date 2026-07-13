import sharp from 'sharp';
import { readdirSync, statSync } from 'fs';
import { join, parse } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

async function convertToAvif(inputPath: string): Promise<void> {
  const { dir, name } = parse(inputPath);
  const outputPath = join(dir, `${name}.avif`);

  await sharp(inputPath)
    .avif({ quality: 80 })
    .toFile(outputPath);

  const inputSize = statSync(inputPath).size;
  const outputSize = statSync(outputPath).size;
  const savings = ((1 - outputSize / inputSize) * 100).toFixed(1);

  console.log(`${name}.png → ${name}.avif (${savings}% smaller)`);
}

async function processDirectory(dirPath: string): Promise<void> {
  const entries = readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      await processDirectory(join(dirPath, entry.name));
    } else if (entry.name.endsWith('.png')) {
      await convertToAvif(join(dirPath, entry.name));
    }
  }
}

const postsDir = join(__dirname, '..', 'blog', 'posts');
console.log('Converting PNG to AVIF...');
await processDirectory(postsDir);
console.log('Done!');
