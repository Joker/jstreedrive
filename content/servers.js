/* ***** BEGIN LICENSE BLOCK *****
   * Version: MPL 1.1/GPL 2.0/LGPL 2.1
   *
   * The contents of this file are subject to the Mozilla Public License Version
   * 1.1 (the "License"); you may not use this file except in compliance with
   * the License. You may obtain a copy of the License at
   * http://www.mozilla.org/MPL/
   *
   * Software distributed under the License is distributed on an "AS IS" basis,
   * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
   * for the specific language governing rights and limitations under the
   * License.
   *
   * The Initial Developer of the Original Code
   * Portions created by the Initial Developer are Copyright (C) 2008
   * the Initial Developer. All Rights Reserved.
   *
   * Joker <deck@joker.exnet.su>
   *
   * Alternatively, the contents of this file may be used under the terms of
   * either the GNU General Public License Version 2 or later (the "GPL"), or
   * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
   * in which case the provisions of the GPL or the LGPL are applicable instead
   * of those above. If you wish to allow use of your version of this file only
   * under the terms of either the GPL or the LGPL, and not to allow others to
   * use your version of this file under the terms of the MPL, indicate your
   * decision by deleting the provisions above and replace them with the notice
   * and other provisions required by the LGPL or the GPL. If you do not delete
   * the provisions above, a recipient may use your version of this file under
   * the terms of any one of the MPL, the GPL or the LGPL.
   *
   * ***** END LICENSE BLOCK ***** */


(function() {
this.init_serverList = function(){
    var Self = ko.extensions.JSTreeDrive;
    
    function Server(protocol, alias, hostname, port, path, username, password){
        this.protocol = protocol;
        this.alias    = alias;
        this.hostname = hostname;
        this.port     = port;
        this.path     = path;
        this.username = username;
        this.password = password;
        
        this.connection     = null;
        this.rf_info        = null;
    }
    Server.prototype.connect = function(){
        window.setCursor("wait");
        // Try and connect to this server now
        try {
            if(!this.connection){
                var lastErrorSvc = Components.classes["@activestate.com/koLastErrorService;1"].
                                         getService(Components.interfaces.koILastErrorService);
                    lastErrorSvc.setLastError(0, ""); // Clear the last error
                    

                var connection = Self.rConnectSvc.getConnection(this.protocol.toLowerCase(),
                                                                this.hostname,
                                                                this.port,
                                                                this.username,
                                                                this.password,
                                                                "");
                
                if (!this.path) this.path = connection.getHomeDirectory();
                this.username             = connection.username;
                this.connection           = connection;
                this.rf_info              = connection.list(this.path, 0);  // 0 for NO refresh
                this.connection.alias     = this.alias;
            }
        } catch (ex) {
            alert("Connection error: " + lastErrorSvc.getLastErrorMessage());
        }
        window.setCursor("auto");
        return this.connection;
    }
    Server.prototype.disconnect = function(){
        if (this.connection) {
            this.connection.close();
            this.connection = null;
        }
    }    


    function get_serversListKo4(){
        try {
            var passwd  = Components.classes["@mozilla.org/passwordmanager;1"].
                          getService(Components.interfaces.nsIPasswordManager);
            var e       = passwd.enumerator;
            
            var list = [];        
            var count = 0;
            while (e.hasMoreElements()) {
                count++;
                var nspassword = e.getNext().QueryInterface(Components.interfaces.nsIPassword);
                var server_info = new String(nspassword.host).split(":");
                
                list.push(   new Server(server_info[0],
                                        server_info[1],
                                        server_info[2],
                                        server_info[3],
                                        server_info[4],
                                        new String(nspassword.user),
                                        new String(nspassword.password)
                                        )
                         );
                list.sort( function (a,b) { if (a.alias==b.alias) return 0; if (a.alias<b.alias) return -1; return 1; });
            }
            
        } catch(e) {
            log.exception(e);
        }
        
        return list;
    }
    function get_serversListKo5(){
        try {
            var list  = [];        
            var server_infoList = Self.rConnectSvc.getServerInfoList( {} );
            
            for (var i=0; i < server_infoList.length; i++){
                
                list.push(  new Server(server_infoList[i].protocol,
                                       server_infoList[i].alias,
                                       server_infoList[i].hostname,
                                       server_infoList[i].port,
                                       server_infoList[i].path,
                                       server_infoList[i].username,
                                       server_infoList[i].password)
                          );
            }        
        } catch(e) {
            log.exception(e);
        }
        
        return list;        
    }    
    
    // +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++   
    
    var appInfo = Components.classes["@activestate.com/koInfoService;1"].
                        getService(Components.interfaces.koIInfoService);
    
    this.servers_list = (appInfo.version[0] <= "4") ? get_serversListKo4() : get_serversListKo5() ;
}

this.init_rowsList = function(){
    var Self = ko.extensions.JSTreeDrive;
    
    function LocalDir  (elPath, elName,      depth, parent_idx, sibling_idx){
        this.path = elPath + elName +'/';         
        this.name = elName;
        
        this.open        = false;
        this.depth       = depth + 1;
        this.parent_idx  = parent_idx;
        this.sibling_idx = sibling_idx;        
    }    
    function LocalFile (elPath, elName){
        this.path = elPath + elName;         
        
        try {
            var sizez = {}
            var time = {}            
            Self.osSvc.stat(this.path,{},{},{},{},{},{},sizez,{},time,{})
        } catch(e) {sizez.value = 'too big'; time.value = '00.00.00'}
        
        this.name = elName;
        this.size = sizez.value;
        this.time = time.value;

        var Ex = this.name.toLowerCase().match(/\.([a-z0-9]{1,4})$/)
        if(Ex && Ex[1]) this.ext = Ex[1]; else this.ext = 'zzznoext';
    }
    //
    LocalDir.prototype.getFileList  = function(){
        var files = [];
        var count = {};
        
        var list_names = Self.osSvc.listdir(this.path, count)
        
        for (var i = 0; i < count.value; i++) {
            if(!Self.osSvc.path.isdir(this.path + list_names[i])){
                files.push(new LocalFile(this.path, list_names[i]));
            }
        }
        
        files.sort( function(a, b) {
                    
                        if(a.ext == b.ext){
                            if(a.name == b.name){
                                return 0;
                            }
                            return (a.name > b.name) ? 1 : -1;
                        }
                        return (a.ext > b.ext) ? 1 : -1;
                    } );
        
        return files;        
    }    
    LocalDir.prototype.setDirList   = function(num, tree_rows){
        var count      = {};
        var dircount   = 0;
        
        var list_names = Self.osSvc.listdir(this.path, count)
            list_names.sort( function(a, b) { if ( (a && b) && (a > b) ) return 1; else return -1; } );
        
        for (var i = 0; i < count.value; i++) {
            if(Self.osSvc.path.isdir(this.path + list_names[i])){
                tree_rows.splice( num + dircount + 1, 0,
                                  new LocalDir(this.path, list_names[i], this.depth, num, dircount)
                                );
                dircount++;
            }
        }
        
        return dircount;        
    }
    LocalDir.prototype.mkLink       = function(){
//        return new LocalDir(this.path.substr(0, this.path.length - this.name.length - 1), this.name, -1, -1, this.sibling_idx)
        var path = this.path.substr(0, this.path.length - this.name.length - 1)
        var L = new LocalDir(path, this.name, -1, -1, this.sibling_idx);
            L.link = 'local';
            Self.prefs_saveTo('{'+ 'path : "' + path + '", sibling_idx : "' + L.sibling_idx + '", name : "' + L.name + '"}')
        return L
    }
    LocalDir.prototype.mkDir        = function(name){
        Self.osSvc.mkdir(this.path + name)
    }
    LocalDir.prototype.mkFile       = function(name){
        var newFile = Self.docSvc.createDocumentFromURI(ko.uriparse.localPathToURI(this.path) + name)
            ko.views.manager.topView.createViewFromDocument(newFile, 'editor')
            newFile.save(true)
    }    
    LocalDir.prototype.remove       = function(){
        var sysUtilsSvc = Components.classes['@activestate.com/koSysUtils;1'].
                                getService(Components.interfaces.koISysUtils);
            sysUtilsSvc.MoveToTrash(this.path.substr(0,this.path.length-1));
    }  
    LocalDir.prototype.rename       =
    LocalFile.prototype.rename      = function(name){
        var new_path = this.path.replace(new RegExp(this.name + '[\/]?$'), name)
        Self.osSvc.rename(this.path , new_path)
        if(Self.osSvc.path.isdir(new_path)) new_path += '/'
        this.path = new_path;
        this.name = name;
    }
    LocalFile.prototype.remove      = function(){
        var sysUtilsSvc = Components.classes['@activestate.com/koSysUtils;1'].
                                getService(Components.interfaces.koISysUtils);
            sysUtilsSvc.MoveToTrash(this.path);
    }     
    LocalFile.prototype.open        = function(){
        switch(this.ext)
        {
            case 'gif':
            case 'jpeg':
            case 'jpg':
            case 'png':
            case 'bmp':
            case 'ico':
                Self.imageView(ko.uriparse.localPathToURI(this.path), this.name, false)
            break;
            default:
                ko.open.URI(ko.uriparse.localPathToURI(this.path))
        }        
    }
    
    function RemoteDir (connection, rf_info, depth, parent_idx, sibling_idx, server_num, name){
        this.rf_info     = rf_info;
        this.connection  = connection;
        
        this.name = name || rf_info.getFilename();        
        
        this.open        = false;
        this.depth       = depth + 1;
        this.parent_idx  = parent_idx;
        this.sibling_idx = sibling_idx;
        this.server_num  = server_num;
    }    
    function RemoteFile(connection, rf_info){
        this.uri  = Self.rConnectSvc.getUriForConnectionAndRfInfo(connection, rf_info) ;        
        this.name = rf_info.getFilename();
        this.size = rf_info.getFileSize();
        this.time = rf_info.getModifiedTime();
        
        var Ex = this.name.toLowerCase().match(/\.([a-z0-9]{1,4})$/)
        if(Ex && Ex[1]) this.ext = Ex[1]; else this.ext = 'zzznoext';
    }
    //
    RemoteDir.prototype.connect     = function(refresh){
        try{     
            if(!this.connection)                              // Depth is 0, it's a server
                this.connection = Self.servers_list[this.server_num].connect();
                
            if(!this.rf_info && this.depth == 0)
                this.rf_info = Self.servers_list[this.server_num].rf_info;
                
            if(this.link && this.link != 'local')
                this.rf_info = this.connection.list(this.link, 1);
            else if ((refresh || this.rf_info.needsDirectoryListing()) && this.rf_info.isDirectory() ) // Ensure the directory has been populated
                this.rf_info = this.connection.list(this.rf_info.getFilepath(), 1);
                
        } catch(e) {
            alert("RemoteDir.prototype.connect" + e);
        }                
    }
    RemoteDir.prototype.getFileList = function(){
        this.connect();
        
        var files = [];
        var count = {};
        
        var rf_info_list = this.rf_info.getChildren(count);
                    
        for (var i = 0; i < count.value; i++) {
            if (rf_info_list[i].isFile()) {
                files.push(new RemoteFile(this.connection, rf_info_list[i]));
            }
        }
        
        files.sort( function(a, b) {
                        if(a.ext == b.ext){
                            if(a.name == b.name){
                                return 0;
                            }
                            return (a.name > b.name) ? 1 : -1;
                        }
                        return (a.ext > b.ext) ? 1 : -1;
                    } );
        return files;
    }
    RemoteDir.prototype.setDirList  = function(num, tree_rows){
        this.connect();
        
        var count        = {};
        var dircount     = 0;
        
        var rf_info_list = this.rf_info.getChildren(count);
            rf_info_list.sort( function(a, b) { var x = a.getFilename();
                                                var y = b.getFilename();
                                                if ( (x && y) && (x > y) ) return 1; else return -1; } );
        
        for (var i = 0; i < count.value; i++) {
            if (rf_info_list[i].isDirectory()) {
                tree_rows.splice( num + dircount + 1, 0,
                                  new RemoteDir(this.connection, rf_info_list[i], this.depth, num, dircount, this.server_num)
                                );
                dircount++;
            }
        }

        return dircount;
    }
    RemoteDir.prototype.mkLink      = function(){
//        return new RemoteDir(this.connection, this.rf_info, -1, -1, 999, this.server_num, this.name);
        var L = new RemoteDir(this.connection, this.rf_info, -1, -1, this.sibling_idx, this.server_num, this.name);
            L.link = L.rf_info.getFilepath();
            Self.prefs_saveTo('{'+ 'link : "' + L.link + '", sibling_idx : "' + L.sibling_idx + '", server_num : "' + L.server_num + '", name : "' + L.name + '"}')
        return L
    }    
    RemoteDir.prototype.mkDir       = function(name){
        this.connection.createDirectory(this.rf_info.getFilepath() + '/' + name, 0755);
    }
    RemoteDir.prototype.mkFile      = function(name){
        var newFile = Self.docSvc.createDocumentFromURI(Self.rConnectSvc.getUriForConnectionAndRfInfo(this.connection, this.rf_info)+ '/' + name)
            ko.views.manager.topView.createViewFromDocument(newFile, 'editor')
            newFile.save(true)        
    }    
    RemoteDir.prototype.rename      = function(name){
        this.connection.rename(this.rf_info.getDirname() + '/' + this.name, this.rf_info.getDirname() + '/' + name);
        this.name = name;
        Self.on_reload(true)
    }
    RemoteDir.prototype.remove      = function(){
        this.connection.removeDirectory(this.rf_info.getDirname() + '/' + this.name);

        Self.on_reload(true)
    }    
    RemoteFile.prototype.rename     = function(name){
        var sRow = Self.S.tree_rows[Self.S.selection.currentIndex];        
        sRow.connection.rename(sRow.rf_info.getFilepath() + '/' + this.name, sRow.rf_info.getFilepath() + '/' + name);
        this.name = name;
    }
    RemoteFile.prototype.remove     = function(){
        var sRow = Self.S.tree_rows[Self.S.selection.currentIndex];        
        sRow.connection.removeFile(sRow.rf_info.getFilepath() + '/' + this.name);
    }    
    RemoteFile.prototype.open       = function(){
        switch(this.ext)
        {
            case 'gif':
                Self.imageView(this.uri, this.name, 'gif');
                break;
            case 'jpeg':
            case 'jpg':
                Self.imageView(this.uri, this.name, 'jpeg');
                break;
            case 'png':
                Self.imageView(this.uri, this.name, 'png');
                break;
            default:
                ko.open.URI(this.uri)
        }
    }    

    try{
        this.init_serverList();
        
        var  numServers   = this.servers_list.length;
        var  serversRows  = [];
        for (var i=0; i < numServers; i++) {
            serversRows.push( new RemoteDir (null, null, -1, -1, i, i, this.servers_list[i].alias) );
        }
        
        // подмешиваем локальный диск
        if(this.osSvc.name == 'nt'){
            
            for(var i=35;i>11;i--)
                if(this.osSvc.access(i.toString(36) + ':/',2))
                    serversRows.splice(0,0,new LocalDir('', i.toString(36).toUpperCase() + ':', -1, -1, 0))
                    
        }else{
            serversRows.splice(0,0,new LocalDir('/', 'Local Drive', -1, -1, 0)) 
            serversRows[0].path = '/';
        }
        // подмешиваем links
        var L, Ltemp;
        Ltemp = this.prefs_loadFrom()
        if(Ltemp){
            this.links = Ltemp.split(";") 
            var links = eval('([' + this.links.join(",") + '])');
                links.reverse()        
            for(L in links){
                if(links[L].link){
                    Ltemp = new RemoteDir(null, null, -1, -1, links[L].sibling_idx, links[L].server_num, links[L].name);
                    Ltemp.link = links[L].link;
                }
                else{                  
                    Ltemp = new LocalDir(links[L].path, links[L].name, -1, -1, links[L].sibling_idx);
                    Ltemp.link = 'local';
                }
                serversRows.splice(0,0, Ltemp);
            }
        }
    } catch(e) {
        log.exception(e);
    }    
    
    return serversRows;    
}



// functions called from overlay.xul
this.on_directorySelect = function(event){
    try {
        // Server directory was selected, update the files shown in the tree
        if (this.S) {
        this.S.update_fileTree_fromDirRow(this.s_XULtree.currentIndex, false /* refresh */);
        }
    } catch (e) {
        window.setCursor("auto");
        alert('on_directorySelect - ' + e);
    }
}
this.on_Open            = function(event){
    try {
        if (event.target.localName != "treechildren" && event.target.localName != "tree")
            return false;
        if (event.type == "click" && (event.button != 0 || event.detail != 2))
            return false;
        if (event.type == "keypress" && event.keyCode != 13)
            return false;

//        Server file was requested to be opened
//        if (this.F) this.F.open_selectedFiles();
        this.F.file_rows[this.F.selection.currentIndex].open();
    } catch (e) {
       alert('on_Open - ' + e);
    }
    return true;
}

// toolbarbutton
this.on_reload          = function(level_up, forse_F){
    var num   = this.S.selection.currentIndex;
    var aRows = this.S.tree_rows;    
    
    if(level_up) num = aRows[num].parent_idx
    
    if(aRows[num].rf_info) aRows[num].connect(true); // for refresh
    
    if(aRows[num].open){
        this.S.clear_subRows(num) // delete subdirs
        this.S.selection.tree.rowCountChanged(num + 1, aRows[num].setDirList(num, aRows)) // add subdirs
    }
    if(this.F.selection.currentIndex > -1){
        this.S.update_fileTree_fromDirRow(num);
    }
    if(forse_F){
        this.S.update_fileTree_fromDirRow(num);
    }
}
this.on_mkDir           = function() {
    var dirName = ko.dialogs.prompt("Enter the name for the new directory");
    if (!dirName) return false;

    var ret = false;
    window.setCursor("wait");
    try {
        this.S.tree_rows[this.S.selection.currentIndex].mkDir(dirName);
        
        this.S.tree_rows[this.S.selection.currentIndex].open = true ;
        this.S.selection.tree.invalidateRow(this.S.selection.currentIndex);
        
        this.on_reload();
        ret = true;
    } catch (ex) {
        alert("Cannot make new directory: " + ex);
    }
    window.setCursor("auto");
    return ret;
}
this.on_mkFile          = function() {
    var fileName = ko.dialogs.prompt("Enter the name for the new file");
    if (!fileName) return false;
    
    var ret = false;
    window.setCursor("wait");
    try {    
        this.S.tree_rows[this.S.selection.currentIndex].mkFile(fileName);
        
        this.on_reload(false, true);
        ret = true;
    } catch (ex) {
        alert("Cannot make new file: " + ex);
    }
    window.setCursor("auto");
    return ret;    
}

// files menupopup
this.on_rename          = function(SorF) {
    try {
        if(SorF == 'S')
            var aRow = this.S.tree_rows[this.S.selection.currentIndex];
        else
            var aRow = this.F.file_rows[this.F.selection.currentIndex];    
        
        var newName = ko.dialogs.prompt("Enter the new name...", null, aRow.name)
        if (!newName || newName == aRow.name) return false;
    
        aRow.rename(newName);
        
        this.on_reload();
        return true;
    } catch (ex) {
        alert("Cannot rename: " + ex);
    }
}
this.on_delete          = function(SorF) {
    if (ko.dialogs.yesNo("Delete ?", "No") == "No") {
      return;
    }
    try {
        if(SorF == 'F'){
            this.F.file_rows[this.F.selection.currentIndex].remove();
        }else{
            if(this.S.tree_rows[this.S.selection.currentIndex].link){
                this.prefs_deleteIt(this.S.selection.currentIndex);
                this.S.clear_subRows(this.S.selection.currentIndex);
                this.S.edit_rowItems('del', this.S.selection.currentIndex)
                return;
            }else{
                this.S.tree_rows[this.S.selection.currentIndex].remove();            
            }            
        }
        
        this.on_reload()
    } catch (ex) {
        alert("Cannot delete: " + ex);
    }        
}
this.on_link            = function() {
    try {   
        this.S.edit_rowItems('link', 0, this.S.selection.currentIndex)
    } catch (ex) {
        alert("Cannot make: " + ex);
    }        
}


this.on_popupShowing    = function() {
    var S_Row = this.S.tree_rows[document.popupNode._lastSelectedRow]
    if(S_Row.depth == 0){
        if(S_Row.link){
            $('menu_rename_S').hidden = true;            
            $('menu_link_S').hidden   = true;
            $('menu_delete_S').hidden = false;
            $('menu_reload_S').hidden = true;
        }           
        else if(S_Row.path){
            $('menu_rename_S').hidden = true;            
            $('menu_link_S').hidden   = true;
            $('menu_delete_S').hidden = true;
            $('menu_reload_S').hidden = false;
        }
        else{
            $('menu_rename_S').hidden = true;            
            $('menu_link_S').hidden   = true;
            $('menu_delete_S').hidden = true;
            $('menu_reload_S').hidden = false;
//            $('jstreedrive_edit_Smenu').appendChild(
//                                            create( "menuitem",{id : "menu_reload_S",
//                                                                label : "Reload",
//                                                                oncommand : "ko.extensions.JSTreeDrive.S.init_List_forView();"})
//                                        );            
        }
    }else{
            $('menu_rename_S').hidden = false;            
            $('menu_link_S').hidden   = false;
            $('menu_delete_S').hidden = false;
            $('menu_reload_S').hidden = true;
    }       
}

    
this.run = function(){
    this.s_XULtree          = document.getElementById("jstreedrive_S_tree");
    this.s_XULtree.view     = this.S;
    this.f_XULtree          = document.getElementById('jstreedrive_F_tree');
    this.f_XULtree.view     = this.F;
    this.S.init_List_forView();
}

}).apply(ko.extensions.JSTreeDrive);

//addEventListener("load", ko.extensions.JSTreeDrive.run, false);
//addEventListener("load", function() { setTimeout(ko.extensions.JSTreeDrive.run, 3000); }, false);
window.addEventListener("load", function(event) { ko.extensions.JSTreeDrive.run(event); }, false);

//            var urls = [];
//            var rangeCount = this.F.selection.getRangeCount();
//            for (var i=0; i < rangeCount; i++) {
//                var start = {}; var end = {};
//                this.F.selection.getRangeAt(i, start, end);
//                
//                for (var c=start.value; c <= end.value; c++) {
//                    urls.push(this.F.file_rows[c]);
//                }
//            }
//            for (var cc in urls) {
//                urls[cc].remove();
//            }
