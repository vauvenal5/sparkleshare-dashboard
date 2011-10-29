var linkCodeProvider = null;
var deviceProvider = null;
var folderProvider = null;

function validateLinkCode(req, res, next) {
  var code = req.param('code');
  if (code) {
    var valid = linkCodeProvider.isCodeValid(code);
    if (valid[0]) {
      req.linkCodeForLogin = valid[1];
      next();
    } else {
      res.send('Invalid link code', 403);
    }
  } else {
    res.send('Invalid link code', 403);
  }
}

function validateAuthCode(req, res, next) {
  var ident = req.header('X-SPARKLE-IDENT');
  var authCode = req.header('X-SPARKLE-AUTH');
  if (!ident || !authCode) {
    res.send('Missing auth code', 403);
  } else {
    deviceProvider.findByDeviceIdent(ident, function(error, device) {
      if (!device) {
        res.send('Invalid ident', 403);
      } else if (device.checkAuthCode(authCode)) {
        next();
      } else {
        res.send('Invalid auth code', 403);
      }
    });
  }
}

Api = function(app, lcp, dp, fp) {
  linkCodeProvider = lcp;
  deviceProvider = dp;
  folderProvider = fp;

  app.post('/api/getAuthCode', validateLinkCode, function(req, res) {
    console.log(req.linkCodeForLogin);
    deviceProvider.createNew(req.param('name'), function(error, dev) {
      res.json({
        ident: dev.ident,
        authCode: dev.authCode
      });
    });
  });
  
  app.get('/api/getFolderList', validateAuthCode, function(req, res, next) {
    folderProvider.findAll(function(error, folders) {
      if (error) { return next(error); }
      var f = [];
      for (var id in folders) {
        if (folders.hasOwnProperty(id)) {
          f.push({
            name: folders[id].name,
            id: folders[id].id,
            type: folders[id].type
          });
        }
      }
      res.json(f);
    });
  });

  app.get('/api/getFile/:folderId', validateAuthCode, loadFolder, function(req, res, next) {
    var filename = req.param('name');
    if (!filename) {
      filename = 'file';
    }
    res.attachment(filename);

    req.loadedFolder.getRawData(req,
      function(error, data) {
        if (error) { return next(error); }
        res.write(data);
      },
      function(error, data) {
        if (error) { return next(error); }
        res.end();
      }
    );
  });

  app.get('/api/getFolderContent/:folderId', validateAuthCode, loadFolder, function(req, res, next) {
    req.loadedFolder.getItems(req, function(error, list) {
      if (error) { return next(error); }

      res.json(list);
    });
  });

  app.get('/api/getFolderRevision/:folderId', validateAuthCode, loadFolder, function(req, res, next) {
    req.loadedFolder.getCurrentRevision(req, function(error, revision) {
      if (error) { return next(error); }
      res.json(revision);
    });
  });

  app.get('/api/getAllItemCount/:folderId', validateAuthCode, loadFolder, function(req, res, next) {
    req.loadedFolder.getAllItemCount(req, function(error, count) {
      if (error) { return next(error); }
      res.json(count);
    });
  });

  app.get('/api/getFolderItemCount/:folderId', validateAuthCode, loadFolder, function(req, res, next) {
    req.loadedFolder.getFolderItemCount(req, function(error, count) {
      if (error) { return next(error); }
      res.json(count);
    });
  });
};

module.exports = Api;
