// Copyright (c) 2014 The Chromium OS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

wam.jsfs.Directory = function() {
  wam.jsfs.Entry.call(this);
  this.entries_ = {};
  this.mtime_ = 0;
};

wam.jsfs.Directory.prototype = wam.jsfs.Entry.subclass(['LIST']);

wam.jsfs.Directory.prototype.addEntry = function(
    name, entry, onSuccess, onError) {
  if (!name) {
    wam.async(onError,
              [null, wam.mkerr('wam.FileSystem.Error.InvalidPath', [name])]);
    return;
  }

  if (name in this.entries_) {
    wam.async(onError,
              [null, wam.mkerr('wam.FileSystem.Error.FileExists', [name])]);
    return;
  }

  wam.async(function() {
      this.entries_[name] = entry;
      onSuccess();
    }.bind(this));
};

wam.jsfs.Directory.prototype.listEntryStats = function(onSuccess, onError) {
  var statCount = Object.keys(this.entries_).length;
  var rv = {};

  var onStat = function(name, stat) {
    rv[name] = {stat: stat};
    if (--statCount == 0)
      onSuccess(rv);
  };

  for (var key in this.entries_) {
    this.entries_[key].getStat(onStat.bind(null, key),
                               onStat.bind(null, key, null));
  }
};

wam.jsfs.Directory.prototype.getStat = function(onSuccess, onError) {
  wam.async(onSuccess,
            [null,
             { opList: this.opList,
               entryCount: Object.keys(this.entries_).length
             }]);
};

wam.jsfs.Directory.prototype.partialResolve = function(
    prefixList, pathList, onSuccess, onError) {
  var entry = this.entries_[pathList[0]];
  if (!entry) {
    // The path doesn't exist past this point, signal our partial success.
    wam.async(onSuccess, [null, prefixList, pathList, this]);

  } else {
    prefixList.push(pathList.shift());

    if (pathList.length == 0) {
      // We've found the full path.
      wam.async(onSuccess, [null, prefixList, pathList, entry]);

    } else if (entry.can('LIST')) {
      // We're not done, descend into a child directory to look for more.
      entry.partialResolve(prefixList, pathList, onSuccess, onError);
    } else {
      // We found a non-directory entry, but there are still remaining path
      // elements.  We'll signal a partial success and let the caller decide
      // if this is fatal or not.
      wam.async(onSuccess, [null, prefixList, pathList, entry]);
    }
  }
};
