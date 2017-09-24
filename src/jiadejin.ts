import * as fs from 'fs';
import * as rp from 'request-promise';
import * as cheerio from 'cheerio';
import * as path from 'path';
import * as _ from 'lodash';

export interface Album {
  id: number;
  title: string;
  images: string[];
}

const baseUrl = 'http://www.jiadejin.com/manhua/2017/0115';

const getAlbumUrl = (id: number) => `${baseUrl}/${id}.html`;

const getPageUrl = (id: number, i: number
) => `${baseUrl}/${id}_${i}.html`;

export function openUrl(url: string, depth = 0): Promise<CheerioStatic> {
  return new Promise((resolve, reject) => {
    rp(url).then((html: string) => {
      const $ = cheerio.load(html);
      resolve($);
    }).catch((err) => {
      //console.log(`Error (depth:${depth}) in ${url}`);
      if (depth > 5) {
        resolve(cheerio.load('<html><body></body></html>'));
        return;
      }
      resolve(openUrl(url, depth + 1));
    });
  });
}

export function downloadImg(uri: string, localPath: string, depth = 0): Promise<any> {
  return new Promise((resolve, reject) => {
    rp.get(uri)
      .on('error', (err) => {
        if (depth > 5) {
          resolve();
          return;
        }
        resolve(downloadImg(uri, localPath, depth + 1));
      })
      .pipe(fs.createWriteStream(localPath))
      .on('error', (err) => { console.log(err); });
  });
}

function downloadAlbum(album: Album): void {
  console.dir(album, { depth: 20, maxArrayLength: 500 });
  const albumDir = path.join(process.cwd(), 'out', album.id.toString());
  !fs.existsSync(albumDir) && fs.mkdirSync(albumDir);
  fs.writeFileSync(path.join(albumDir, album.title), '');
  album.images.forEach((imgUrl: string, i: number) => {
    const localPath = path.join(albumDir, `${i + 1}${path.extname(imgUrl)}`);
    downloadImg(imgUrl, localPath);
  });
}

function extractImage(id: number, i: number, cb?: Function): void {
  const pageUrl = getPageUrl(id, i);
  openUrl(pageUrl).then($ => {
    const imgUrl = $('.content img').attr('src');
    imgUrl && cb && cb(imgUrl);
  });
}

function extractAlbum(id: number): void {
  const albumUrl = getAlbumUrl(id);
  openUrl(albumUrl).then($ => {
    const imgUrl = $('.content img').attr('src');
    const title = $('.listBoxTitle h2').text() || 'title';
    const album: Album = { id, title, images: [imgUrl] };
    const pageEl = $('.pagelist li a').first();
    const pageLen = Number((pageEl.text().match(/\d+/) || [])[0]);
    _.times(pageLen - 1, (i: number) => {
      extractImage(id, i + 2, (imgUrl) => {
        album.images[i + 1] = imgUrl;
        const validLen = album.images.filter(x => x).length;
        validLen >= pageLen && downloadAlbum(album);
      });
    });
  });
}

console.log(process.argv.join(' '));
extractAlbum(1681);