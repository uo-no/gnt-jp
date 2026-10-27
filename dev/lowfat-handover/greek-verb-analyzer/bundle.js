const fs = require('fs');
const path = require('path');

// 指定フォルダ以下からすべての .json ファイルを再帰的に取得する関数
function getAllJsonFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);
  arrayOfFiles = arrayOfFiles || [];

  files.forEach(file => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllJsonFiles(fullPath, arrayOfFiles);
    } else if (file.endsWith('.json')) {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

const ntDir = path.join(__dirname, 'bible_data', 'nt');
if (!fs.existsSync(ntDir)) {
  console.error('❌ エラー: bible_data/nt フォルダが見つかりません。');
  process.exit(1);
}

console.log('🔄 フォルダ内のJSONファイルを探索中...');
const jsonFiles = getAllJsonFiles(ntDir);
let allData = [];

jsonFiles.forEach(filePath => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    if (Array.isArray(data)) {
      allData.push(...data);
    } else {
      allData.push(data);
    }
  } catch (err) {
    console.error(`⚠️ 読み込みエラー (${filePath}):`, err.message);
  }
});

// 拡張機能が読み込むルートに morphgnt.json として出力
const outputPath = path.join(__dirname, 'morphgnt.json');
fs.writeFileSync(outputPath, JSON.stringify(allData, null, 2), 'utf-8');

console.log(`✨ 結合完了！ 合計 ${allData.length} 件のデータを morphgnt.json に出力しました。`);