const ReactNative = require("react-native");
const RNSound = ReactNative.NativeModules.RNSound;
const IsAndroid = RNSound.IsAndroid;
const IsWindows = RNSound.IsWindows;
const resolveAssetSource = require("react-native/Libraries/Image/resolveAssetSource");
const eventEmitter = new ReactNative.NativeEventEmitter(RNSound);

function isRelativePath(path) {
  return !/^(\/|http(s?)|asset)/.test(path);
}

// Hash function to compute key from the filename
function djb2Code(str) {
  let hash = 5381, i, char;
  for (i = 0; i < str.length; i++) {
    char = str.charCodeAt(i);
    hash = ((hash << 5) + hash) + char; /* hash * 33 + c */
  }
  return hash;
}
class Sound {

  constructor(filename, basePath, onError, options) {
    const asset = resolveAssetSource(filename);
    if (asset) {
      this._filename = asset.uri;
      onError = basePath;
    } else {
      this._filename = basePath ? basePath + "/" + filename : filename;

      if (IsAndroid && !basePath && isRelativePath(filename)) {
        this._filename = filename.toLowerCase().replace(/\.[^.]+$/, "");
      }
    }

    this._loaded = false;
    this._key = asset ? filename : djb2Code(filename); //if the file is an asset, use the asset number as the key
    this._playing = false;
    this._duration = -1;
    this._numberOfChannels = -1;
    this._volume = 1;
    this._pan = 0;
    this._numberOfLoops = 0;
    this._speed = 1;

    RNSound.prepare(this._filename, this._key, options || {}, (error, props) => {
      if (props) {
        if (typeof props.duration === "number") {
          this._duration = props.duration;
        }
        if (typeof props.numberOfChannels === "number") {
          this._numberOfChannels = props.numberOfChannels;
        }
      }
      if (error === null) {
        this._loaded = true;

        if (this.onPlaySubscription != null) {
          console.warn("On Play change event listener is already registered");
          return;
        }

        if (!IsWindows) {
          this.onPlaySubscription = eventEmitter.addListener(
          "onPlayChange",
          (param) => {
            const { isPlaying, playerKey } = param;
            if (playerKey === this._key) {
              if (isPlaying) {
                this._playing = true;
              }
              else {
                this._playing = false;
              }
            }
          }
        );
        }
      }
      onError && onError(error, props);
    });
  }

  isLoaded = () => {
    return this._loaded;
  };

  play = (onEnd) => {
    if (this._loaded) {
      RNSound.play(this._key, (successfully) => onEnd && onEnd(successfully));
    } else {
      onEnd && onEnd(false);
    }
    return this;
  };

  pause = (callback) => {
    if (this._loaded) {
      RNSound.pause(this._key, () => {
        this._playing = false;
        callback && callback();
      });
    }
    return this;
  };

  stop = (callback) => {
    if (this._loaded) {
      RNSound.stop(this._key, () => {
        this._playing = false;
        callback && callback();
      });
    }
    return this;
  };

  reset = () => {
    if (this._loaded && IsAndroid) {
      RNSound.reset(this._key);
      this._playing = false;
    }
    return this;
  };

  release = () => {
    if (this._loaded) {
      RNSound.release(this._key);
      this._loaded = false;
      if (!IsWindows) {
        if (this.onPlaySubscription != null) {
          this.onPlaySubscription.remove();
          this.onPlaySubscription = null;
        }
      }
    }
    return this;
  };

  getDuration = () => {
    return this._duration;
  };

  getNumberOfChannels = () => {
    return this._numberOfChannels;
  };

  getVolume = () => {
    return this._volume;
  };

  setVolume = (value) => {
    this._volume = value;
    if (this._loaded) {
      if (IsAndroid || IsWindows) {
        RNSound.setVolume(this._key, value, value);
      } else {
        RNSound.setVolume(this._key, value);
      }
    }
    return this;
  };

  getSystemVolume = (callback) => {
    if(IsAndroid) {
      RNSound.getSystemVolume(callback);
    }
    return this;
  };

  setSystemVolume = (value) => {
    if (IsAndroid) {
      RNSound.setSystemVolume(value);
    }
    return this;
  };

  getPan = () => {
    return this._pan;
  };

  setPan = (value) => {
    if (this._loaded) {
      RNSound.setPan(this._key, this._pan = value);
    }
    return this;
  };

  getNumberOfLoops = () => {
    return this._numberOfLoops;
  };

  setNumberOfLoops = (value) => {
    this._numberOfLoops = value;
    if (this._loaded) {
      if (IsAndroid || IsWindows) {
        RNSound.setLooping(this._key, !!value);
      } else {
        RNSound.setNumberOfLoops(this._key, value);
      }
    }
    return this;
  };

  setSpeed = (value) => {
    this._speed = value;
    if (this._loaded) {
      if (!IsWindows) {
        RNSound.setSpeed(this._key, value);
      }
    }
    return this;
  };

  getCurrentTime = (callback) => {
    if (this._loaded) {
      RNSound.getCurrentTime(this._key, callback);
    }
  };

  setCurrentTime = (value) => {
    if (this._loaded) {
      RNSound.setCurrentTime(this._key, value);
    }
    return this;
  };

// android only
  setSpeakerphoneOn = (value) => {
    if (IsAndroid) {
      RNSound.setSpeakerphoneOn(this._key, value);
    }
  };

// ios only

// This is deprecated.  Call the static one instead.
  setCategory = (value) => {
    Sound.setCategory(value, false);
  }

  isPlaying = () => {
    return this._playing;
  }

  static enable(enabled) {
    RNSound.enable(enabled);
  }

  static enableInSilenceMode(enabled) {
    if (!IsAndroid && !IsWindows) {
      RNSound.enableInSilenceMode(enabled);
    }
  }

  static setActive(value) {
    if (!IsAndroid && !IsWindows) {
      RNSound.setActive(value);
    }
  }

  static setCategory(value, mixWithOthers = false) {
    if (!IsWindows) {
      RNSound.setCategory(value, mixWithOthers);
    }
  }

  static setMode(value) {
    if (!IsAndroid && !IsWindows) {
      RNSound.setMode(value);
    }
  }

  static MAIN_BUNDLE = RNSound.MainBundlePath;
  static DOCUMENT = RNSound.NSDocumentDirectory;
  static LIBRARY = RNSound.NSLibraryDirectory;
  static CACHES = RNSound.NSCachesDirectory;
}




module.exports = Sound;
