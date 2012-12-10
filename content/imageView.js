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


ko.extensions.JSTreeDrive.imageView = function (Img, tab_name, type) {

    function encode64(input) {
        var keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
        var output = "";
        var chr1, chr2, chr3;
        var enc1, enc2, enc3, enc4;
        var i = 0;
        do {
            chr1 = input.charCodeAt(i++);
            chr2 = input.charCodeAt(i++);
            chr3 = input.charCodeAt(i++);
            enc1 = chr1 >> 2;
            enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
            enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
            enc4 = chr3 & 63;
            if (isNaN(chr2)) {
                enc3 = enc4 = 64;
            } else {
                if (isNaN(chr3)) {
                    enc4 = 64;
                }
            }
            output = output + keyStr.charAt(enc1) + keyStr.charAt(enc2) + keyStr.charAt(enc3) + keyStr.charAt(enc4);
        } while (i < input.length);
        return output;
    }
    function create( name, attributes ){
        var el = document.createElementNS("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul", name );
        if ( typeof attributes == 'object' ) {
            for ( var i in attributes ){
                el.setAttribute( i, attributes[i] );
            }
        }
        for ( var i = 2; i<arguments.length; i++ ) {
            var child = arguments[i];
                if ( typeof child == 'string' )
                            child = document.createTextNode( child );
                el.appendChild( child );
        }
        return el;
    }

    try {
        ko.views.manager.topView.currentView.setAttribute("collapsed", "false");
        
        var v, tab, tabbox = ko.views.manager.topView.currentView.tabbox;
        var uu = Components.classes['@mozilla.org/uuid-generator;1'].getService(Components.interfaces.nsIUUIDGenerator);
        var tabpanelId = uu.generateUUID();
        
        var img_doc = ko.extensions.JSTreeDrive.docSvc.createDocumentFromURI(Img);
        
        if(type){
            window.setCursor("wait");
            img_doc.load();
            Img = 'data:image/' + type + ';base64,' + encode64(img_doc.encodedText);
            window.setCursor("auto");
        }       
        
        var tabpanel =  create( "tabpanel", {flex : "1" },
                        v = create( "view", {flex : '1', type : 'xul'},
                                create( "vbox", {flex : '1'},
                                    create( "separator", {flex : '1'}),
                                    create( "hbox", {},
                                        create( "separator", {flex : '1'}),
                                        create( "image"    , {src  : Img, style : "max-height:600px; max-width:800px;"}),
                                        create( "separator", {flex : '1'})
                                    ),
                                    create( "separator", {flex : '1'})
                                )
                            )
                        );
                            
            tabpanel.id     = tabpanelId;
            tabpanel._tab   = tab = create( "tab",{ type    : "file-tab",
                                                    label   : tab_name,
                                                    onclick : "this.parentNode.parentNode.parentNode.tabClicked(this,event);",
                                                    id      : uu.generateUUID() 
                                                  }
                                    );
                              tab.linkedPanel = tabpanelId;
            
        tabbox._tabs.appendChild(tab);
        tabbox._tabpanels.appendChild(tabpanel);
        tabbox.firstChild.removeAttribute("closedisabled");
        tabbox.handleCtrlTab = "false";            
        
        v.parentView = ko.views.manager.topView.currentView;
        v.document = img_doc;
        
        v.init();
        v.makeCurrent();
    } catch (e) { alert(e); }
    
    return v;
}

//function decode64(input) {
//    var output = "";
//    var chr1, chr2, chr3;
//    var enc1, enc2, enc3, enc4;
//    var i = 0;
//    input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
//    do {
//        enc1 = keyStr.indexOf(input.charAt(i++));
//        enc2 = keyStr.indexOf(input.charAt(i++));
//        enc3 = keyStr.indexOf(input.charAt(i++));
//        enc4 = keyStr.indexOf(input.charAt(i++));
//        chr1 = (enc1 << 2) | (enc2 >> 4);
//        chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
//        chr3 = ((enc3 & 3) << 6) | enc4;
//        output = output + String.fromCharCode(chr1);
//        if (enc3 != 64) {
//            output = output + String.fromCharCode(chr2);
//        }
//        if (enc4 != 64) {
//            output = output + String.fromCharCode(chr3);
//        }
//    } while (i < input.length);
//    return output;
//}