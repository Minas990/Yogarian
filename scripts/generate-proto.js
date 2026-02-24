const { execSync } = require('child_process');
const glob = require('glob');
const path = require('path');
const files = glob.sync('libs/common/src/proto/*.proto');

const pluginPath = path.resolve(__dirname, '../node_modules/.bin/protoc-gen-ts_proto' + (process.platform === 'win32' ? '.cmd' : ''));
const outputDir = path.resolve(__dirname, '../libs/common/src/generated');
const fs = require('fs');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

files.forEach((file) => {
  execSync(
    `protoc --plugin=protoc-gen-ts_proto=${pluginPath} --ts_proto_out=libs/common/src/generated --ts_proto_opt=nestJs=true,esModuleInterop=true,outputServices=grpc-js,useOptionals=messages --proto_path=libs/common/src/proto ${file}`,
    { stdio: 'inherit' }
  );
});