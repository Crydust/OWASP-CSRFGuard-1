/**
 * The OWASP CSRFGuard Project, BSD License
 * Eric Sheridan (eric@infraredsecurity.com), Copyright (c) 2011 
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 *    1. Redistributions of source code must retain the above copyright notice,
 *       this list of conditions and the following disclaimer.
 *    2. Redistributions in binary form must reproduce the above copyright
 *       notice, this list of conditions and the following disclaimer in the
 *       documentation and/or other materials provided with the distribution.
 *    3. Neither the name of OWASP nor the names of its contributors may be used
 *       to endorse or promote products derived from this software without specific
 *       prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
 * ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
/*jslint browser: true, devel: true, nomen: true, sloppy: true, vars: true */
/*global XMLHttpRequest, alert, document, navigator, window */
(function() {
    var EventCache = (function() {
        var listEvents = [];
        return {
            listEvents: listEvents,
            add: function() {
                listEvents.push(arguments);
            },
            flush: function() {
                var i, item;
                for (i = listEvents.length - 1; i >= 0; i = i - 1) {
                    item = listEvents[i];
                    if (item[0].removeEventListener) {
                        item[0].removeEventListener(item[1], item[2], item[3]);
                    }
                    if (item[1].substring(0, 2) !== "on") {
                        item[1] = "on" + item[1];
                    }
                    if (item[0].detachEvent) {
                        item[0].detachEvent(item[1], item[2]);
                    }
                    item[0][item[1]] = null;
                }
            }
        };
    }());
    /**
     * Code to ensure our event always gets triggered when the DOM is updated.
     * @param obj
     * @param type
     * @param fn
     * @source http://www.dustindiaz.com/rock-solid-addevent/
     */
    function addEvent(obj, type, fn) {
        if (obj.addEventListener) {
            obj.addEventListener(type, fn, false);
            EventCache.add(obj, type, fn);
        } else if (obj.attachEvent) {
            obj["e" + type + fn] = fn;
            obj[type + fn] = function() {
                obj["e" + type + fn](window.event);
            };
            obj.attachEvent("on" + type, obj[type + fn]);
            EventCache.add(obj, type, fn);
        } else {
            obj["on" + type] = obj["e" + type + fn];
        }
    }
    /**
     * run before window.onload
     * @see https://github.com/jfriend00/docReady
     * @see http://stackoverflow.com/a/9899701/11451
     */
    var docReady = (function () {
        var readyList = [];
        var readyFired = false;
        var readyEventHandlersInstalled = false;
        function ready() {
            if (!readyFired) {
                readyFired = true;
                for (var i = 0; i < readyList.length; i++) {
                    readyList[i].fn.call(window, readyList[i].ctx);
                }
                readyList = [];
            }
        }
        function readyStateChange() {
            if (document.readyState === "complete") {
                ready();
            }
        }
        return function (callback, context) {
            if (readyFired) {
                window.setTimeout(function () {
                    callback(context);
                }, 1);
                return;
            } else {
                readyList.push({
                    fn: callback,
                    ctx: context
                });
            }
            if (document.readyState === "complete") {
                window.setTimeout(ready, 1);
            } else if (!readyEventHandlersInstalled) {
                if (document.addEventListener) {
                    document.addEventListener("DOMContentLoaded", ready, false);
                    window.addEventListener("load", ready, false);
                    // prevent memory leak in old ie
                    EventCache.add(document, "DOMContentLoaded", ready);
                    EventCache.add(window, "load", ready);
                } else {
                    document.attachEvent("onreadystatechange", readyStateChange);
                    window.attachEvent("onload", ready);
                    // prevent memory leak in old ie
                    EventCache.add(document, "onreadystatechange", readyStateChange);
                    EventCache.add(window, "load", ready);
                }
                readyEventHandlersInstalled = true;
            }
        };
    }());
    // string utility functions
    function startsWith(str, prefix) {
        return str.indexOf(prefix) === 0;
    }
    function endsWith(str, suffix) {
        var lastIndex = str.lastIndexOf(suffix);
        return lastIndex !== -1 && lastIndex + suffix.length === str.length;
    }
    // hook using standards based prototype
    function hijackStandard() {
        var originalOpen = XMLHttpRequest.prototype.open;
        var originalSend = XMLHttpRequest.prototype.send;
        XMLHttpRequest.prototype.open = function(method, url) {
            this.url = url;
            originalOpen.apply(this, arguments);
        };
        XMLHttpRequest.prototype.send = function() {
            if (typeof this.onsend === "function") {
                this.onsend.apply(this, arguments);
            }
            originalSend.apply(this, arguments);
        };
    }
    // ie does not properly support prototype - wrap completely
    function hijackExplorer() {
        var RealXMLHttpRequest = window.XMLHttpRequest;
        function FakeXMLHttpRequest() {
            if (!(this instanceof FakeXMLHttpRequest)) {
                return new FakeXMLHttpRequest();
            } else {
                this.base = this.createXHR();
                // properties
                this.status = 0;
                this.statusText = "";
                this.readyState = FakeXMLHttpRequest.UNSENT;
                this.responseText = "";
                this.responseXML = null;
                //this.onsend = null;
                this.url = null;
                this.onreadystatechange = null;
            }
        }
        if (RealXMLHttpRequest){
            FakeXMLHttpRequest.prototype.createXHR = function(){
                return new RealXMLHttpRequest();
            };
        } else {
            FakeXMLHttpRequest.prototype.createXHR = function(){
                return new window.ActiveXObject("Microsoft.XMLHTTP");
            };
        }
        // constants
        FakeXMLHttpRequest.UNSENT = 0;
        FakeXMLHttpRequest.OPENED = 1;
        FakeXMLHttpRequest.HEADERS_RECEIVED = 2;
        FakeXMLHttpRequest.LOADING = 3;
        FakeXMLHttpRequest.DONE = 4;
        // methods
        FakeXMLHttpRequest.prototype.open = function(method, url, async, user, pass) {
            var self = this;
            this.url = url;
            this.base.onreadystatechange = function() {
                try {
                    self.status = self.base.status;
                } catch (e1) {}
                try {
                    self.statusText = self.base.statusText;
                } catch (e2) {}
                try {
                    self.readyState = self.base.readyState;
                } catch (e3) {}
                try {
                    self.responseText = self.base.responseText;
                } catch (e4) {}
                try {
                    self.responseXML = self.base.responseXML;
                } catch (e5) {}
                if (typeof self.onreadystatechange === "function") {
                    self.onreadystatechange.apply(this, arguments);
                }
            };
            this.base.open(method, url, async, user, pass);
        };
        FakeXMLHttpRequest.prototype.send = function(data) {
            if (typeof this.onsend === "function") {
                this.onsend.apply(this, arguments);
            }
            this.base.send(data);
        };
        FakeXMLHttpRequest.prototype.abort = function() {
            this.base.abort();
        };
        FakeXMLHttpRequest.prototype.getAllResponseHeaders = function() {
            return this.base.getAllResponseHeaders();
        };
        FakeXMLHttpRequest.prototype.getResponseHeader = function(name) {
            return this.base.getResponseHeader(name);
        };
        FakeXMLHttpRequest.prototype.setRequestHeader = function(name, value) {
            return this.base.setRequestHeader(name, value);
        };
        // hook
        window.XMLHttpRequest = FakeXMLHttpRequest;
    }
    // fix for problems with ipv6
    function normalizeIPv6(hostname) {
        if (typeof hostname !== "string") {
            return hostname;
        }
        if (hostname.indexOf(":") !== -1 && !startsWith(hostname, "[")) {
            return ["[", hostname, "]"].join("");
        }
        return hostname;
    }
    // check if valid domain based on domainStrict
    function isValidDomain(current, target) {
        var result = false;
        // check exact or subdomain match
        if (normalizeIPv6(current) === normalizeIPv6(target)) {
            result = true;
        } else if ("%DOMAIN_STRICT%" === "false") {
            if (startsWith(target, ".")) {
                result = endsWith(current, target);
            } else {
                result = endsWith(current, "." + target);
            }
        }
        return result;
    }
    var urlPartsCache = {};
    function getUrlParts(url) {
        if (typeof url !== "string") {
            return null;
        }
        if (!urlPartsCache.hasOwnProperty(url)) {
            var isMSIE = /MSIE \d+\.\d+;/.test(navigator.userAgent);
            // msie 11 still seems to need special care here
            isMSIE = isMSIE || (navigator.userAgent.indexOf("Trident/") != -1);
            isMSIE = isMSIE && !window.opera;
            var div = document.createElement("div");
            div.innerHTML = "<a></a>";
            div.firstChild.href = url;
            div.innerHTML = "" + div.innerHTML;
            if (isMSIE) {
                try {
                    document.body.appendChild(div);
                } catch (e) {}
            }
            var link = div.firstChild;
            var pathname = link.pathname;
            if (typeof pathname === "string" && !startsWith(pathname, "/")) {
                pathname = "/" + pathname;
            }
            // http://www.example.com:8080/lorem/ipsum?a=b&c=d#f
            // protocol = http:
            // host = www.example.com:8080
            // hostname = www.example.com
            // pathname = /lorem/ipsum
            // search = ?a=b&c=d
            // hash = #f
            var result = {
                protocol: link.protocol,
                host: link.host,
                hostname: link.hostname,
                pathname: pathname,
                search: link.search,
                hash: link.hash,
                href: [ link.protocol, "//", link.host, pathname, link.search, link.hash ].join("")
            };
            link = null;
            if (isMSIE) {
                try {
                    document.body.removeChild(div);
                } catch (e) {}
            }
            div = null;
            urlPartsCache[url] = result;
        }
        return urlPartsCache[url];
    }
    function canonicalizeUrl(url, searchModifier) {
        var parts = getUrlParts(url);
        var search = parts.search;
        if (typeof searchModifier === "function") {
            search = searchModifier(search);
        }
        return [ parts.protocol, "//", parts.host, parts.pathname, search, parts.hash ].join("");
    }
    function addSearchParameterToUrl(url, key, value) {
        return canonicalizeUrl(url, function(search) {
            if (search.indexOf("&" + key + "=" + value) === -1 && search.indexOf("?" + key + "=" + value) === -1) {
                var seperator = search.indexOf("?") === -1 ? "?" : "&";
                return [ search, seperator, key, "=", value ].join("");
            }
            return search;
        });
    }
    // determine if uri/url points to valid domain
    function isValidUrl(src) {
        var result = false;
        if (src.substring(0, 7) === "http://" || src.substring(0, 8) === "https://") {
            return isValidDomain(document.domain, getUrlParts(src).hostname);
        } else if (src.charAt(0) === '#') {
            result = false;
            /** ensure it is a local resource without a protocol **/
        } else if (!startsWith(src, "//") && (src.charAt(0) === '/' || src.indexOf(':') === -1)) {
            result = true;
        }
        return result;
    }
    // parse uri from url (as in request.getRequestURI())
    function parseUri(url) {
        return getUrlParts(url).pathname;
    }
    // obtain array of page specific tokens
    function requestPageTokens() {
        var i, len;
        var xhr = window.XMLHttpRequest ? new window.XMLHttpRequest() : new window.ActiveXObject("Microsoft.XMLHTTP");
        var pageTokens = {};
        // false means synchronous, or in other words: slow
        xhr.open("POST", "%SERVLET_PATH%", false);
        xhr.send(null);
        var text = xhr.responseText;
        var name = "";
        var value = "";
        var nameContext = true;
        for (i = 0, len = text.length; i < len; i += 1) {
            var character = text.charAt(i);
            if (character === ":") {
                nameContext = false;
            } else if (character !== ",") {
                if (nameContext) {
                    name += character;
                } else {
                    value += character;
                }
            }
            if (character === "," || i + 1 >= len) {
                pageTokens[name] = value;
                name = "";
                value = "";
                nameContext = true;
            }
        }
        return pageTokens;
    }
    // inject tokens as hidden fields into forms
    function injectTokenForm(form, tokenName, tokenValue, pageTokens) {
        var action = form.getAttribute("action");
        if (action !== null && action !== undefined && isValidUrl(action)) {
            var uri = parseUri(action);
            var hidden = document.createElement("input");
            hidden.setAttribute("type", "hidden");
            hidden.setAttribute("name", tokenName);
            hidden.setAttribute("value", pageTokens[uri] || tokenValue);
            form.appendChild(hidden);
        }
    }
    // inject tokens as query string parameters into url
    function injectTokenAttribute(element, attr, tokenName, tokenValue, pageTokens) {
        var location = element.getAttribute(attr);
        if (location !== null && location !== undefined && isValidUrl(location)) {
            var uri = parseUri(location);
            var value = pageTokens[uri] || tokenValue;
            var alteredLocation = addSearchParameterToUrl(location, tokenName, value);
            if (location !== alteredLocation) {
                try {
                    element.setAttribute(attr, alteredLocation);
                } catch (e) {}
            }
        }
    }
    // inject csrf prevention tokens throughout dom
    function injectTokens(tokenName, tokenValue) {
        var i, len;
        // obtain reference to page tokens if enabled
        var pageTokens = {};
        if ("%TOKENS_PER_PAGE%" === "true") {
            pageTokens = requestPageTokens();
        }
        // iterate over all elements and injection token
        if ("%INJECT_FORMS%" === "true") {
            var csrfForm = function(form) {
                injectTokenForm(form, tokenName, tokenValue, pageTokens);
                injectTokenAttribute(form, "action", tokenName, tokenValue, pageTokens);
            };
            var allForms = document.getElementsByTagName("form");
            for (i = 0, len = allForms.length; i < len; i += 1) {
                csrfForm(allForms[i]);
            }
            window.csrfForm = csrfForm;
        }
        if ("%INJECT_ATTRIBUTES%" === "true") {
            var all = [];
            if (document.querySelectorAll) {
                all = document.querySelectorAll("[src],[href]");
            } else if (document.getElementsByTagName) {
                all = document.getElementsByTagName("*");
            } else if (document.all) {
                all = document.all;
            } else {
                all = [];
            }
            len = all.length;
            for (i = len - 1; i >= 0; i -= 1) {
                var element = all[i];
                // inject into form
                if (element.tagName.toLowerCase() !== "form") {
                    injectTokenAttribute(element, "src", tokenName, tokenValue, pageTokens);
                    injectTokenAttribute(element, "href", tokenName, tokenValue, pageTokens);
                }
            }
        }
        // hijack window.open
        window.open = (function (open) {
            return function (url, name, features) {
                if (url !== null && url !== undefined && isValidUrl(url)) {
                    var uri = parseUri(url);
                    var value = pageTokens[uri] || tokenValue;
                    url = addSearchParameterToUrl(url, tokenName, value);
                }
                // set name if missing here
                name = name || "default_window_name";
                if (open.call) {
                    return open.call(window, url, name, features);
                } else {
                    //ie8
                    return open(url, name, features);
                }
            };
        }(window.open));
    }
    // Only inject the tokens if the JavaScript was referenced from HTML that
    // was served by us. Otherwise, the code was referenced from malicious HTML
    // which may be trying to steal tokens using JavaScript hijacking techniques.
    if (isValidDomain(document.domain, "%DOMAIN_ORIGIN%")) {
        // optionally include Ajax support
        if ("%INJECT_XHR%" === "true") {
            var isMSIE = /MSIE \d+\.\d+;/.test(navigator.userAgent);
            // no need to detect msie 11 here
            //isMSIE = isMSIE || (navigator.userAgent.indexOf("Trident/") != -1);
            isMSIE = isMSIE && !window.opera;
            if (isMSIE) {
                hijackExplorer();
            } else {
                hijackStandard();
            }
            XMLHttpRequest.prototype.onsend = function() {
                if (isValidUrl(this.url)) {
                    this.setRequestHeader("X-Requested-With", "%X_REQUESTED_WITH%");
                    this.setRequestHeader("%TOKEN_NAME%", "%TOKEN_VALUE%");
                }
            };
        }
        // update nodes in DOM after load
        addEvent(window, "unload", EventCache.flush);
        docReady(function() {
            injectTokens("%TOKEN_NAME%", "%TOKEN_VALUE%");
        });
    } else {
        alert("OWASP CSRFGuard JavaScript was included from within an unauthorized domain!");
    }
}());