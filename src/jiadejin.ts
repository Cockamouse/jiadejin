import * as fs from 'fs';
import * as rp from 'request-promise';
import * as cheerio from 'cheerio';
import * as path from 'path';
import * as _ from 'lodash';
import * as iconv from 'iconv-lite';

export interface Album {
  id: number;
  title: string;
  images: string[];
}

const decodeStr = (str) => iconv.decode(new Buffer(str), 'GB2312');

const mobileUrl = 'http://m.jiadejin.com';
const baseUrl = 'http://www.jiadejin.com';
const downloadFile = 'download.sh';

const getListUrl = (url: string) => `${mobileUrl}/manhua/${url}`;
const getAlbumUrl = (url: string) => `${baseUrl}${url}`;
const getPageUrl = (templateUrl: string, i: number
) => {
  const url = templateUrl.replace(/\.html$/, `_${i}.html`);
  return `${baseUrl}${url}`;
};

const curlCmd = (imgUrl: string, albumDir: string, i: number) => {
  const extname = path.extname(imgUrl);
  const localPath = path.join(albumDir, `${i}${extname}`);
  return `curl -o ${localPath} ${imgUrl};`;
};

export function openUrl(url: string, depth = 0): Promise<CheerioStatic> {
  return new Promise((resolve, reject) => {
    rp(url, { encoding: null }).then((html: string) => {
      const $ = cheerio.load(decodeStr(html));
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

/*
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
*/

function downloadAlbum(album: Album): void {
  console.dir(album, { depth: 20, maxArrayLength: 500 });
  const outDir = path.join(process.cwd(), 'out');
  const albumDir = path.join(outDir, album.id.toString());
  !fs.existsSync(albumDir) && fs.mkdirSync(albumDir);
  fs.writeFileSync(path.join(albumDir, album.title), '');
  /*
  album.images.forEach((imgUrl: string, i: number) => {
    const localPath = path.join(albumDir, `${i + 1}${path.extname(imgUrl)}`);
    downloadImg(imgUrl, localPath);
  });
  */
  const content = `\nmkdir -p ${albumDir} #${album.title}\n` + album.images.map((imgUrl, i) => curlCmd(imgUrl, albumDir, i + 1)).join('\n');
  fs.appendFileSync(path.join(outDir, downloadFile), content);
}

function extractImage(url: string, i: number, cb?: Function): void {
  const pageUrl = getPageUrl(url, i);
  openUrl(pageUrl).then($ => {
    const imgUrl = $('.content img').attr('src');
    imgUrl && cb && cb(imgUrl);
  });
}

function extractAlbum(url: string, titleDef: string): void {
  const albumUrl = getAlbumUrl(url);
  const id = Number((url.match(/\d+(?=\.html$)/) || [])[0]);
  openUrl(albumUrl).then($ => {
    const imgUrl = $('.content img').attr('src');
    const title = $('.listBoxTitle h2').text() || 'title';
    const album: Album = { id, title, images: [imgUrl] };
    const pageEl = $('.pagelist li a').first();
    const pageLen = Number((pageEl.text().match(/\d+/) || [])[0]);
    _.times(pageLen - 1, (i: number) => {
      extractImage(url, i + 2, (imgUrl) => {
        album.images[i + 1] = imgUrl;
        const validLen = album.images.filter(x => x).length;
        validLen >= pageLen && downloadAlbum(album);
      });
    });
  });
}

function extractList(listUrl: string): void {
  openUrl(listUrl).then($ => {
    const listEls = $('.pic1 a.pic img');
    listEls.each((i, listEl) => {
      const albumUrl = listEl.parent.attribs.href;
      const title = listEl.attribs.alt.replace(/(^<b>|<\/b>$)/g, '');
      //console.log(`${albumUrl}:${title}`);
      extractAlbum(albumUrl, title);
    });
  });
}

function extractRoot(): void {
  openUrl(`${mobileUrl}/manhua/index.html`).then($ => {
    const totalEl = $('.pageinfo strong').first();
    const total: number = Number((totalEl.text().match(/\d+/) || [])[0]);
    const lastEl = $('.showpage li a').last();
    const template = lastEl.attr('href');
    _.times(total, (i) => {
      const listUrl = getListUrl(template.replace(/\d+\.html$/, `${i + 1}.html`));
      extractList(listUrl);
    });
  });
}

function jiadejin(): void {
  extractRoot();
}

console.log(process.argv.join(' '));
const downloadFileAbs = path.join(process.cwd(), 'out', downloadFile);
!fs.existsSync(downloadFileAbs) && fs.writeFileSync(downloadFileAbs, '');
//extractAlbum('/manhua/2017/0115/1681.html', '');
extractList(getListUrl(process.argv[2]));
//jiadejin();