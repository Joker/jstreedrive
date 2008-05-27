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

JSTreeDrive = {
    os           : Components.classes["@activestate.com/koOs;1"].getService(),
    rcService    : Components.classes["@activestate.com/koRemoteConnectionService;1"].
                         getService(Components.interfaces.koIRemoteConnectionService),    
    
    servers_list : null,
    
    S : new dinamicTree_serversView(),
    F : new dinamicTree_filesView()
}
//

JSTreeDrive.init_serverList = function(){
    function Server(protocol, alias, hostname, port, path, username, password) {
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
                    

                var connection = JSTreeDrive.rcService.getConnection(this.protocol.toLowerCase(),
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

    // +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++   
    
    
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
    
    this.servers_list = list;
}
//

JSTreeDrive.init_rowsList = function(){
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
        
        var size = {}
        var time = {}        
        JSTreeDrive.os.stat(this.path,{},{},{},{},{},{},size,{},time,{})
       
        this.name = elName;
        this.size = size.value;
        this.time = time.value;

        var Ex = this.name.toLowerCase().match(/\.([a-z0-9]{1,4})$/)
        if(Ex && Ex[1]) this.ext = Ex[1]; else this.ext = null;
    }
    //
    LocalDir.prototype.getFileList  = function(){
        var files = [];
        var count = {};
        
        var list_names = JSTreeDrive.os.listdir(this.path, count)
        
        for (var i = 0; i < count.value; i++) {
            if(!JSTreeDrive.os.path.isdir(this.path + list_names[i])){
                files.push(new LocalFile(this.path, list_names[i]));
            }
        }
        
        files.sort( function(a, b) {
                        if(a.ext == b.ext){
                            if(a.name == b.name){
                                return 0;
                            }
                            return (a.name < b.name) ? -1 : 1;
                        }
                        return (a.ext < b.ext) ? -1 : 1;
                    } );
        return files;        
    }    

    LocalDir.prototype.setDirList   = function(num, tree_rows){
        var count      = {};
        var dircount   = 0;
        
        var list_names = JSTreeDrive.os.listdir(this.path, count)
            list_names.sort( function(a, b) { if ( (a && b) && (a > b) ) return 1; else return -1; } );
        
        for (var i = 0; i < count.value; i++) {
            if(JSTreeDrive.os.path.isdir(this.path + list_names[i])){
                tree_rows.splice( num + dircount + 1, 0,
                                  new LocalDir(this.path, list_names[i], this.depth, num, dircount)
                                );
                dircount++;
            }
        }
        
        return dircount;        
    }
    LocalDir.prototype.mkDir        = function(name){
        JSTreeDrive.os.mkdir(this.path + name)
    }
    LocalDir.prototype.rename       =
    LocalFile.prototype.rename      = function(name){
        var new_path = this.path.replace(new RegExp(this.name + '[\/]?$'), name)
        JSTreeDrive.os.rename(this.path , new_path)
        if(JSTreeDrive.os.path.isdir(new_path)) new_path += '/'
        this.path = new_path;
        this.name = name;
    }   
    LocalDir.prototype.remove       =
    LocalFile.prototype.remove      = function(){    
        ko.statusBar.AddMessage("Comming soon =)", "JSTreeDrive", 5000, true);    
    }
    //
    
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
        this.uri  = JSTreeDrive.rcService.getUriForConnectionAndRfInfo(connection, rf_info) ;        
        this.name = rf_info.getFilename();
        this.size = rf_info.getFileSize();
        this.time = rf_info.getModifiedTime();
        
        var Ex = this.name.toLowerCase().match(/\.([a-z0-9]{1,4})$/)
        if(Ex && Ex[1]) this.ext = Ex[1]; else this.ext = null;
    }
    //
    RemoteDir.prototype.connect     = function(refresh){
        try{        
            if(!this.connection)                              // Depth is 0, it's a server
                this.connection = JSTreeDrive.servers_list[this.server_num].connect();
                
            if(!this.rf_info && this.depth == 0)
                this.rf_info = JSTreeDrive.servers_list[this.server_num].rf_info;
            
            if ((refresh || this.rf_info.needsDirectoryListing()) && this.rf_info.isDirectory() ) // Ensure the directory has been populated
                this.rf_info = this.connection.list(this.rf_info.getFilepath(), 1);
                
                
        } catch(e) {
            log.exception("RemoteDir.prototype.setDirList" + e);
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
                            return (a.name < b.name) ? -1 : 1;
                        }
                        return (a.ext < b.ext) ? -1 : 1;
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
    RemoteDir.prototype.mkDir       = function(name){
        this.connection.createDirectory(this.rf_info.getFilepath() + '/' + name, 0755);
    }
    RemoteDir.prototype.rename      = function(name){
        this.connection.rename(this.rf_info.getDirname() + '/' + this.name, this.rf_info.getDirname() + '/' + name);
        this.name = name;
        JSTreeDrive.on_reload(true)
    }
    RemoteDir.prototype.remove      = function(){
        this.connection.removeDirectory(this.rf_info.getDirname() + '/' + this.name);

        JSTreeDrive.on_reload(true)
    }    
    RemoteFile.prototype.rename     = function(name){
        var sRow = JSTreeDrive.S.tree_rows[JSTreeDrive.S.selection.currentIndex];        
        sRow.connection.rename(sRow.rf_info.getFilepath() + '/' + this.name, sRow.rf_info.getFilepath() + '/' + name);
        this.name = name;
        JSTreeDrive.on_reload()
    }
    RemoteFile.prototype.remove     = function(){
        var sRow = JSTreeDrive.S.tree_rows[JSTreeDrive.S.selection.currentIndex];        
        sRow.connection.removeFile(sRow.rf_info.getFilepath() + '/' + this.name);
    }    
    //
    

    try{
        this.init_serverList();
        
        var  numServers   = JSTreeDrive.servers_list.length;
        var  serversRows  = [];
        for (var i=0; i < numServers; i++) {
            serversRows.push( new RemoteDir (null, null, -1, -1, i, i, JSTreeDrive.servers_list[i].alias) );
        }
        
        // подмешиваем локальный диск
        if(JSTreeDrive.os.name == 'nt'){
            var DName = ['H', 'G', 'F', 'E', 'D', 'C'];
            for(var d in DName){
                if(JSTreeDrive.os.access(DName[d] + ':/',2))
                serversRows.splice(0,0,new LocalDir('', DName[d] + ':', -1, -1, 0))
            }
        }else{
            serversRows.splice(0,0,new LocalDir('/', 'Local Drive', -1, -1, 0)) 
            serversRows[0].path = '/';
        }
        
        
    } catch(e) {
        log.exception(e);
    }    
    
    return serversRows;    
}
//






// functions called from overlay
JSTreeDrive.on_directorySelect = function(event){
    try {
        // Server directory was selected, update the files shown in the tree
        if (JSTreeDrive.S) {
        JSTreeDrive.S.update_fileTree_fromDirRow(JSTreeDrive.servers_tree.currentIndex, false /* refresh */);
        }
    } catch (e) {
        window.setCursor("auto");
        alert('on_directorySelect - ' + e);
    }
}
JSTreeDrive.on_remoteOpen      = function(event){
    try {
        if (event.target.localName != "treechildren" && event.target.localName != "tree")
            return false;
        if (event.type == "click" && (event.button != 0 || event.detail != 2))
            return false;
        if (event.type == "keypress" && event.keyCode != 13)
            return false;

        // Server file was requested to be opened
        if (JSTreeDrive.F) JSTreeDrive.F.open_selectedFiles();
        
    } catch (e) {
       alert('on_remoteOpen - ' + e);
    }
    return true;
}
JSTreeDrive.on_mkDir           = function() {
    var dirName = ko.dialogs.prompt("Enter the name for the new directory");
    if (!dirName) return false;

    var ret = false;
    window.setCursor("wait");
    try {
        JSTreeDrive.S.tree_rows[JSTreeDrive.S.selection.currentIndex].mkDir(dirName);
        
        JSTreeDrive.S.tree_rows[JSTreeDrive.S.selection.currentIndex].open = true ;
        JSTreeDrive.S.selection.tree.invalidateRow(JSTreeDrive.S.selection.currentIndex);
        
        JSTreeDrive.on_reload();
        ret = true;
    } catch (ex) {
        alert("Cannot make new directory: " + ex);
    }
    window.setCursor("auto");
    return ret;
}

JSTreeDrive.on_renameFile      = function(SorF) {
    try {
        if(SorF == 'S')
            var aRow = JSTreeDrive.S.tree_rows[JSTreeDrive.S.selection.currentIndex];
        else
            var aRow = JSTreeDrive.F.file_rows[JSTreeDrive.F.selection.currentIndex];    
        
        var newName = ko.dialogs.prompt("Enter the new name for the file or directory", null, aRow.name)
        if (!newName || newName == aRow.name) return false;
    
        aRow.rename(newName)
        
        return true
    } catch (ex) {
        alert("Cannot rename: " + ex);
    }
}

JSTreeDrive.on_deleteFiles     = function(SorF) {
    if (ko.dialogs.yesNo("Are you sure you want to delete the selected files?", "No") == "No") {
      return;
    }
    try {
        if(SorF == 'F'){
            var urls = [];
            var rangeCount = JSTreeDrive.F.selection.getRangeCount();
            for (var i=0; i < rangeCount; i++) {
                var start = {}; var end = {};
                JSTreeDrive.F.selection.getRangeAt(i, start, end);
                
                for (var c=start.value; c <= end.value; c++) {
                    urls.push(JSTreeDrive.F.file_rows[c]);
                }
            }
            for (var cc in urls) {
                urls[cc].remove();
            }
            
            JSTreeDrive.on_reload()
        }else{
            JSTreeDrive.S.tree_rows[JSTreeDrive.S.selection.currentIndex].remove();
        }
    } catch (ex) {
        alert("Cannot delete: " + ex);
    }        
}
JSTreeDrive.on_reload          = function(level_up) {
    var num   = JSTreeDrive.S.selection.currentIndex;
    var aRows = JSTreeDrive.S.tree_rows;    
    
    if(level_up) num = aRows[num].parent_idx
    
    if(aRows[num].rf_info) aRows[num].connect(true); // for refresh
    
    if(aRows[num].open){
        JSTreeDrive.S.clear_subRows(num) // delete subdirs
        JSTreeDrive.S.selection.tree.rowCountChanged(num + 1, aRows[num].setDirList(num, aRows)) // add subdirs
    }
    if(JSTreeDrive.F.selection.currentIndex > -1){
        JSTreeDrive.S.update_fileTree_fromDirRow(num);
    }
}



   
    
JSTreeDrive.run = function(){
    JSTreeDrive.servers_tree      = document.getElementById("jstreedrive_S_tree");
    JSTreeDrive.servers_tree.view = JSTreeDrive.S;
    JSTreeDrive.files_tree        = document.getElementById('jstreedrive_F_tree');
    JSTreeDrive.files_tree.view   = JSTreeDrive.F;
    JSTreeDrive.S.init_List_forView();
}


addEventListener("load", JSTreeDrive.run, false);

//    void rename(in wstring oldName, in wstring newName);
//    void removeFile(in wstring name);
//    void removeDirectory(in wstring name);
//    void changeDirectory(in wstring path);
//    void currentDirectory();
//    void createFile(in wstring name, in long permissions);
//    void createDirectory(in wstring name, in long permissions) 0755;
//    void getHomeDirectory([retval] out wstring path);
//    void getParentPath(in wstring path, [retval] out wstring parentPath);


