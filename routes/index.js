require('dotenv').config();
var express = require('express');
var formidable = require('formidable');
var path = require('path');
var fs = require('fs');
var mime = require('mime-types');
var router = express.Router();
var cStorageDir = path.resolve(__dirname + process.env.C_STORAGE);

/* GET home page. */
router.get('/', function (req, res, next) {
  res.status(200).send('Welcome to (D:) Drive File API');
});

/** POST upload a file */
router.post('/file/upload/:id/:dir', function (req, res, next) {
  let rootDir = `${cStorageDir}/${req.params.id}`;
  // check if root exists
  try {
    if (!fs.existsSync(rootDir)) {
      fs.mkdirSync(rootDir)
    }
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
  let dirPath = rootDir;
  let searchDir = req.params.dir;
  // if there is specific upload directory, get path
  if (searchDir !== "null") {
    let root = new TreeNode(rootDir);
    let stack = [root];

    while (stack.length) {
      let currentNode = stack.pop();

      if (currentNode) {
        let children = fs.readdirSync(currentNode.path);

        for (let child of children) {
          let childPath = `${currentNode.path}/${child}`;
          if (child === searchDir) dirPath = childPath;
          let file = {};
          let childNode = new TreeNode(childPath, file);
          currentNode.children.push(childNode);

          if (fs.statSync(childNode.path).isDirectory()) {
            stack.push(childNode);
          }
        }
        if (dirPath !== rootDir)
          break;
      }
    }
  }
  // formidable options
  let options = {
    uploadDir: dirPath,
    keepExtensions: true,
    maxFileSize: 1024 * 1024 * 1024,
    allowEmptyFiles: true,
    multiples: true,
  }
  // save file
  let form = new formidable.IncomingForm(options);
  form.on('file', function (field, file) {
    //rename the incoming file to the file's name
    fs.renameSync(file.path, dirPath + "/" + file.name);
  });
  form.parse(req, (err, fields, files) => {
    if (err) {
      console.error(err);
      res.sendStatus(500);
    }
    res.json({ fields, files });
  });
});

/** POST download a file */
router.post('/file/download', function (req, res, next) {
  let data = req.body;
  // console.log(data);
  try {
    res.download(data.filePath);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

/** POST rename a file */
router.post('/file/rename', function (req, res, next) {
  let data = req.body;
  // console.log(data);
  try {
    let currDirArr = data.filePath.split("/");
    let currDirPath = currDirArr.slice(0, currDirArr.length - 1).toString();
    let newFilePath = currDirPath.replace(/,/g, "/") + `/${data.newName}`;
    fs.renameSync(data.filePath, newFilePath);
    res.status(200).json("renamed");
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

/** POST delete a file */
router.post('/file/delete', function (req, res, next) {
  let data = req.body;
  // console.log(data);
  try {
    fs.unlinkSync(data.filePath);
    res.status(200).json("deleted");
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

/** GET directory tree */
router.get('/directory/:id', function (req, res, next) {
  let rootDir = `${cStorageDir}/${req.params.id}`;
  try {
    if (!fs.existsSync(rootDir)) {
      fs.mkdirSync(rootDir)
    }
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }

  let root = new TreeNode(rootDir);
  let stack = [root];

  while (stack.length) {
    let currentNode = stack.pop();

    if (currentNode) {
      let children = fs.readdirSync(currentNode.path);

      for (let child of children) {
        let childPath = `${currentNode.path}/${child}`;
        let file = {};
        file.name = path.basename(childPath);
        file.type = mime.lookup(childPath);
        file.lastModified = fs.statSync(childPath).mtime;
        file.size = fs.statSync(childPath).size;
        let childNode = new TreeNode(childPath, file);
        currentNode.children.push(childNode);

        if (fs.statSync(childNode.path).isDirectory()) {
          stack.push(childNode);
        }
      }
    }
  }

  res.status(200).json(root);
});

/** POST add a directory */
router.post('/directory/add', function (req, res, next) {
  let data = req.body;
  // console.log(data);
  try {
    if (!fs.existsSync(data.newDirPath)) {
      fs.mkdirSync(data.newDirPath)
      res.status(200).json("created");
    } else {
      res.status(200).json("directory-exists");
    }
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

/** POST rename a directory */
router.post('/directory/rename', function (req, res, next) {
  let data = req.body;
  // console.log(data);
  try {
    let currDirArr = data.dirPath.split("/");
    let currDirPath = currDirArr.slice(0, currDirArr.length - 1).toString();
    let newDirPath = currDirPath.replace(/,/g, "/") + `/${data.newName}`;
    if (!fs.existsSync(newDirPath)) {
      fs.renameSync(data.dirPath, newDirPath);
      res.status(200).json("renamed");
    } else {
      res.status(200).json("directory-name-exists");
    }
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

/** POST delete a directory */
router.post('/directory/delete', function (req, res, next) {
  let data = req.body;
  // console.log(data);
  try {
    fs.rmdirSync(data.dirPath, { recursive: true });
    res.status(200).json("deleted");
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

module.exports = router;

/** To Store Directory Tree */
class TreeNode {
  path;
  file;
  children;

  constructor(path, file) {
    this.path = path;
    this.file = file;
    this.children = new Array();
  }
}