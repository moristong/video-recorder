var config  = {
  "count": 0,
  "data": [],
  "stream": {},
  "elements": {},
  "recorder": null,
  "permission": {},
  "time": {
    "stop": 0,
    "start": 0
  },
  "page": {
    "camera": "chrome://settings/content/camera",
    "microphone": "chrome://settings/content/microphone",
    "resize": "https://webbrowsertools.com/video-resizer/",
    "convert": "https://webbrowsertools.com/video-converter/"
  },
  "addon": {
    "homepage": function () {
      return chrome.runtime.getManifest().homepage_url;
    }
  },
  "duration": function (ms) {
    const date = new Date(null);
    date.setSeconds(ms / 1000);
    /*  */
    return date.toISOString().slice(11, 19);
  },
  "size": function (s) {
    if (s) {
      if (s >= Math.pow(2, 30)) {return (s / Math.pow(2, 30)).toFixed(1) + " GB"};
      if (s >= Math.pow(2, 20)) {return (s / Math.pow(2, 20)).toFixed(1) + " MB"};
      if (s >= Math.pow(2, 10)) {return (s / Math.pow(2, 10)).toFixed(1) + " KB"};
      return s + " B";
    } else return '';
  },
  "app": {
    "start": async function () {
      const theme = config.storage.read("theme") !== undefined ? config.storage.read("theme") : "light";
      config.permission.camera = config.storage.read("camera-permission") !== undefined ? config.storage.read("camera-permission") : true;
      config.permission.microphone = config.storage.read("microphone-permission") !== undefined ? config.storage.read("microphone-permission") : false;  
      /*  */
      camera.checked = config.permission.camera;
      microphone.checked = config.permission.microphone;
      document.documentElement.setAttribute("theme", theme !== undefined ? theme : "light");
      /*  */
      const action = document.querySelector(".action");
      await new Promise((resolve, reject) => {window.setTimeout(resolve, 300)});
      action.removeAttribute("loading");
    },
    "stop": {
      "camera": function () {
        const tracks = config.stream.combine.getTracks();
        for (let i = 0; i < tracks.length; i++) {
          tracks[i].stop();
          config.stream.combine.removeTrack(tracks[i]);
        }
        /*  */
        if (config.recorder && config.recorder.state !== "inactive") {
          delete config.stream.combine;
          config.recorder.stop();
          config.data = [];
        }
      }
    }
  },
  "resize": {
    "timeout": null,
    "method": function () {
      if (config.port.name === "win") {
        if (config.resize.timeout) window.clearTimeout(config.resize.timeout);
        config.resize.timeout = window.setTimeout(async function () {
          const current = await chrome.windows.getCurrent();
          /*  */
          config.storage.write("interface.size", {
            "top": current.top,
            "left": current.left,
            "width": current.width,
            "height": current.height
          });
        }, 1000);
      }
    }
  },
  "port": {
    "name": '',
    "connect": function () {
      config.port.name = "webapp";
      const context = document.documentElement.getAttribute("context");
      /*  */
      if (chrome.runtime) {
        if (chrome.runtime.connect) {
          if (context !== config.port.name) {
            if (document.location.search === "?tab") config.port.name = "tab";
            if (document.location.search === "?win") config.port.name = "win";
            /*  */
            chrome.runtime.connect({
              "name": config.port.name
            });
          }
        }
      }
      /*  */
      document.documentElement.setAttribute("context", config.port.name);
    }
  },
  "storage": {
    "local": {},
    "read": function (id) {
      return config.storage.local[id];
    },
    "load": function (callback) {
      chrome.storage.local.get(null, function (e) {
        config.storage.local = e;
        callback();
      });
    },
    "write": function (id, data) {
      if (id) {
        if (data !== '' && data !== null && data !== undefined) {
          let tmp = {};
          tmp[id] = data;
          config.storage.local[id] = data;
          chrome.storage.local.set(tmp, function () {});
        } else {
          delete config.storage.local[id];
          chrome.storage.local.remove(id, function () {});
        }
      }
    }
  },
  "listener": {
    "data": function (e) {
      config.data.push(e.data);
    },
    "stop": function () {
      const a = document.createElement('a');
      const li = document.createElement("li");
      const spansize = document.createElement("span");
      const spanduration = document.createElement("span");
      const filename = (new Date()).toString().slice(0, 24);
      const blob = new Blob(config.data, {"type": "video/webm"});
      const duration = new Date(config.time.end - config.time.start);
      /*  */
      a.textContent = filename + " 🠯";
      a.href = URL.createObjectURL(blob);
      li.textContent = "#" + (++config.count);
      spansize.textContent = config.size(blob.size);
      spanduration.textContent = config.duration(duration.getTime());
      a.download = "Video " + filename.replace(/ /g, '-').replace(/:/g, '-') + ".webm";
      /*  */
      li.appendChild(a);
      li.appendChild(spansize);
      li.appendChild(spanduration);
      list.appendChild(li);
      /*  */
      config.app.stop.camera();
      window.setTimeout(function () {a.click()}, 300);
    },
    "start": async function () {
      config.elements.info.camera.removeAttribute("denied");
      config.elements.info.microphone.removeAttribute("denied");
      /*  */
      if (navigator.mediaDevices) {
        try {
          config.stream.combine = await navigator.mediaDevices.getUserMedia({
            "video": config.permission.camera, 
            "audio": config.permission.microphone
          });
          /*  */
          if (config.stream.combine) {
            const player = document.getElementById("player");
            player.srcObject = config.stream.combine;
          }
        } catch (e) {
          const a = await navigator.permissions.query({"name": "camera"});
          const b = await navigator.permissions.query({"name": "microphone"});
          const c = a.state === "denied" && config.permission.camera === true;
          const d = b.state === "denied" && config.permission.microphone === true;
          /*  */
          let error = '';
          if (c && d) error = "Camera & Microphone permissions are denied!\nPlease adjust the permissions and try again.";
          else if (c) error = "Camera permission is denied!\nPlease adjust the permission and try again.";
          else if (d) error = "Microphone permission is denied!\nPlease adjust the permission and try again.";
          else if (config.permission.camera === false) error = "Please mark the - Access Camera - checkbox and try again."
          else error = "An error has occurred, please try again.";
          /*  */
          window.alert(error);
          /*  */
          if (config.port.name !== "webapp") {
            if (a.state === "denied") {
              config.elements.info.camera.setAttribute("denied", '');
              chrome.tabs.create({"url": config.page.camera, "active": true});
            }
            /*  */
            if (b.state === "denied") {
              config.elements.info.microphone.setAttribute("denied", '');
              chrome.tabs.create({"url": config.page.microphone, "active": true});
            }
          }
        }
      } else {
        window.alert("Error! navigator.mediaDevices is not available!");
      }
    }
  },
  "load": function () {
    const stop = document.getElementById("stop");
    const start = document.getElementById("start");
    const theme = document.getElementById("theme");
    const player = document.getElementById("player");
    const camera = document.getElementById("camera");
    const reload = document.getElementById("reload");
    const action = document.querySelector(".action");
    const resize = document.getElementById("resize");
    const convert = document.getElementById("convert");
    const support = document.getElementById("support");
    const donation = document.getElementById("donation");
    const microphone = document.getElementById("microphone");
    /*  */
    config.elements.info = {};
    config.elements.info.camera = document.getElementById("camera-permission");
    config.elements.info.microphone = document.getElementById("microphone-permission");
    /*  */
    reload.addEventListener("click", function () {
      document.location.reload();
    });
    /*  */
    camera.addEventListener("change", function (e) {
      config.permission.camera = e.target.checked;
      config.storage.write("camera-permission", config.permission.camera);
    });
    /*  */
    microphone.addEventListener("change", function (e) {
      config.permission.microphone = e.target.checked;
      config.storage.write("microphone-permission", config.permission.microphone);
    });
    /*  */
    resize.addEventListener("click", function () {
      const url = config.page.resize;
      chrome.tabs.create({"url": url, "active": true});
    }, false);
    /*  */
    convert.addEventListener("click", function () {
      const url = config.page.convert;
      chrome.tabs.create({"url": url, "active": true});
    }, false);
    /*  */
    config.elements.info.camera.addEventListener("click", function () {
      const url = config.page.camera;
      chrome.tabs.create({"url": url, "active": true});
    }, false);
    /*  */
    config.elements.info.microphone.addEventListener("click", function () {
      const url = config.page.microphone;
      chrome.tabs.create({"url": url, "active": true});
    }, false);
    /*  */
    theme.addEventListener("click", function () {
      let attribute = document.documentElement.getAttribute("theme");
      attribute = attribute === "dark" ? "light" : "dark";
      /*  */
      document.documentElement.setAttribute("theme", attribute);
      config.storage.write("theme", attribute);
    }, false);
    /*  */
    support.addEventListener("click", function () {
      if (config.port.name !== "webapp") {
        const url = config.addon.homepage();
        chrome.tabs.create({"url": url, "active": true});
      }
    }, false);
    /*  */
    donation.addEventListener("click", function () {
      if (config.port.name !== "webapp") {
        const url = config.addon.homepage() + "?reason=support";
        chrome.tabs.create({"url": url, "active": true});
      }
    }, false);
    /*  */
    stop.addEventListener("click", function () {
      action.removeAttribute("recording");
      /*  */
      if (config.recorder) {
        player.pause();
        player.currentTime = 0;
        player.srcObject = null;
        config.time.end = new Date();
        if (config.recorder) config.recorder.stop();
      }
    });
    /*  */
    start.addEventListener("click", async function () {
      action.setAttribute("loading", '');
      await config.listener.start();
      await new Promise(resolve => window.setTimeout(resolve, 300));
      action.removeAttribute("loading");
      /*  */
      if (config.stream.combine) {
        if (config.stream.combine.active) {
          config.recorder = new MediaRecorder(config.stream.combine, {"mimeType": "video/webm"});
          config.recorder.addEventListener("dataavailable", config.listener.data);
          config.recorder.addEventListener("stop", config.listener.stop);
          /*  */
          if (config.recorder) {
            action.setAttribute("recording", '');
            config.time.start = new Date();
            config.recorder.start();
            player.play();
          }
        }
      }
    });
    /*  */
    action.setAttribute("loading", '');
    config.storage.load(config.app.start);
    window.removeEventListener("load", config.load, false);
  }
};

config.port.connect();

window.addEventListener("load", config.load, false);
window.addEventListener("resize", config.resize.method, false);
