"use client";

import type React from "react";
import { useState, useRef, useCallback, useEffect } from "react";
import * as THREE from "three";

const GoogleStreetView360 = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [compassRotation, setCompassRotation] = useState(0);
  const [showMiniMap, setShowMiniMap] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState<{
    x: number;
    y: number;
  }>({ x: 0, y: 0 });
  const [viewMode, setViewMode] = useState<
    "normal" | "fisheye" | "stereographic" | "littlePlanet"
  >("normal");
  const [mapType, setMapType] = useState<"satellite" | "terrain" | "roadmap">(
    "satellite"
  );
  const [isDraggingPegman, setIsDraggingPegman] = useState(false);
  const [pegmanPosition, setPegmanPosition] = useState({ x: 50, y: 50 });
  const [mapZoom, setMapZoom] = useState(1);
  const [isMapHovered, setIsMapHovered] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sphereRef = useRef<THREE.Mesh | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const animationIdRef = useRef<number | null>(null);

  // Store rotation values
  const rotationRef = useRef({ x: 0, y: 0 });
  const targetRotationRef = useRef({ x: 0, y: 0 });

  // Video from public folder
  const video360Url = "/beach.mp4";

  const handleSearch = (e: React.KeyboardEvent) => {
    e.preventDefault();
    console.log("Searching for:", searchQuery);
  };

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 0.1);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
      preserveDrawingBuffer: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.toneMappingExposure = 1.1;

    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const video = document.createElement("video");
    video.src = video360Url;
    video.crossOrigin = "anonymous";
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;
    videoRef.current = video;

    const texture = new THREE.VideoTexture(video);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = false;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    texture.flipY = true;
    texture.needsUpdate = true;

    const geometry = new THREE.SphereGeometry(500, 128, 64);
    geometry.scale(-1, 1, 1);

    const material = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.DoubleSide,
      transparent: false,
      alphaTest: 0,
      toneMapped: false,
      fog: false,
      depthWrite: true,
      depthTest: true,
    });

    const sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);
    sphereRef.current = sphere;

    // Add contract address text
    const createTextGeometry = (
      text: string,
      position: THREE.Vector3,
      rotation: THREE.Euler,
      fontSize: number = 64
    ) => {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d")!;
      canvas.width = 2048;
      canvas.height = 512;

      context.fillStyle = "#2c1810";
      context.font = `bold ${fontSize}px monospace`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.shadowColor = "#000000";
      context.shadowBlur = 6;
      context.shadowOffsetX = 3;
      context.shadowOffsetY = 3;
      context.fillText(text, canvas.width / 2, canvas.height / 2);

      const textTexture = new THREE.CanvasTexture(canvas);
      textTexture.needsUpdate = true;

      const textGeometry = new THREE.PlaneGeometry(100, 25);
      const textMaterial = new THREE.MeshBasicMaterial({
        map: textTexture,
        transparent: true,
        alphaTest: 0.1,
        side: THREE.DoubleSide,
      });

      const textMesh = new THREE.Mesh(textGeometry, textMaterial);
      textMesh.position.copy(position);
      textMesh.rotation.copy(rotation);

      return textMesh;
    };

    const contractText = createTextGeometry(
      "CA: 0x742d35Cc6634C0532925a3b8D63C4e64c6A6E6E2",
      new THREE.Vector3(0, -50, -80),
      new THREE.Euler(-Math.PI / 2.2, 0, 0),
      56
    );
    scene.add(contractText);

    const networkText = createTextGeometry(
      "Pump.fun",
      new THREE.Vector3(0, -65, -85),
      new THREE.Euler(-Math.PI / 2.2, 0, 0),
      48
    );
    scene.add(networkText);

    video.play().catch((err) => {
      console.log("Video playback failed, trying on user interaction", err);
    });

    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);

      rotationRef.current.x +=
        (targetRotationRef.current.x - rotationRef.current.x) * 0.1;
      rotationRef.current.y +=
        (targetRotationRef.current.y - rotationRef.current.y) * 0.1;

      camera.rotation.order = "YXZ";
      camera.rotation.y = rotationRef.current.y;
      camera.rotation.x = rotationRef.current.x;
      camera.rotation.z = 0;

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!cameraRef.current || !rendererRef.current) return;
      cameraRef.current.aspect = window.innerWidth / window.innerHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      if (rendererRef.current && container) {
        container.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.src = "";
      }
    };
  }, []);

  // Update zoom
  useEffect(() => {
    if (cameraRef.current) {
      const fov = 75 / zoom;
      cameraRef.current.fov = Math.max(30, Math.min(110, fov));
      cameraRef.current.updateProjectionMatrix();
    }
  }, [zoom]);

  // Update view mode
  useEffect(() => {
    if (cameraRef.current) {
      switch (viewMode) {
        case "fisheye":
          cameraRef.current.fov = 110 / zoom;
          break;
        case "stereographic":
          cameraRef.current.fov = 120 / zoom;
          break;
        case "littlePlanet":
          cameraRef.current.fov = 140 / zoom;
          targetRotationRef.current.x = -Math.PI / 2;
          break;
        default:
          cameraRef.current.fov = 75 / zoom;
          break;
      }
      cameraRef.current.updateProjectionMatrix();
    }
  }, [viewMode, zoom]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      e.preventDefault();
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;

      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;

      targetRotationRef.current.y += deltaX * 0.002;
      targetRotationRef.current.x += deltaY * 0.002;

      targetRotationRef.current.x = Math.max(
        -Math.PI / 2,
        Math.min(Math.PI / 2, targetRotationRef.current.x)
      );

      setCompassRotation(-targetRotationRef.current.y * (180 / Math.PI));
      setDragStart({ x: e.clientX, y: e.clientY });
    },
    [isDragging, dragStart]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowContextMenu(true);
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
  }, []);

  const handleViewModeChange = (mode: typeof viewMode) => {
    setViewMode(mode);
    setShowContextMenu(false);

    if (mode === "littlePlanet") {
      targetRotationRef.current.x = -Math.PI / 2;
    } else if (mode === "normal") {
      targetRotationRef.current.x = 0;
    }
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(3, prev + 0.2));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(0.5, prev - 0.2));
  };

  const handleMapZoomIn = () => {
    setMapZoom((prev) => Math.min(3, prev + 0.5));
  };

  const handleMapZoomOut = () => {
    setMapZoom((prev) => Math.max(0.5, prev - 0.5));
  };

  const handleClose = () => {
    if (typeof window !== "undefined") {
      window.history.back();
    }
  };

  const toggleMiniMap = () => {
    setShowMiniMap(!showMiniMap);
  };

  const closeMiniMap = () => {
    setShowMiniMap(false);
  };

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  }, []);

  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(
    null
  );

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStart) return;

      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStart.x;
      const deltaY = touch.clientY - touchStart.y;

      targetRotationRef.current.y += deltaX * 0.002;
      targetRotationRef.current.x += deltaY * 0.002;

      targetRotationRef.current.x = Math.max(
        -Math.PI / 2,
        Math.min(Math.PI / 2, targetRotationRef.current.x)
      );

      setCompassRotation(-targetRotationRef.current.y * (180 / Math.PI));
      setTouchStart({ x: touch.clientX, y: touch.clientY });
    },
    [touchStart]
  );

  const handleTouchEnd = useCallback(() => {
    setTouchStart(null);
  }, []);

  // Mini map click handler
  const handleMiniMapClick = useCallback(
    (e: React.MouseEvent) => {
      if (!showMiniMap) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;

      // Convert click position to rotation
      const newY = (x - 0.5) * Math.PI * 2; // Full 360 degrees
      const newX = (y - 0.5) * Math.PI; // Up/down looking

      targetRotationRef.current.y = newY;
      targetRotationRef.current.x = Math.max(
        -Math.PI / 2,
        Math.min(Math.PI / 2, newX)
      );
      setCompassRotation(-newY * (180 / Math.PI));
    },
    [showMiniMap]
  );

  // Pegman drag handlers
  const handlePegmanMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDraggingPegman(true);
    const rect = e.currentTarget.parentElement!.getBoundingClientRect();
    setPegmanPosition({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  }, []);

  const handlePegmanMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDraggingPegman) return;
      e.stopPropagation();

      const rect = e.currentTarget.getBoundingClientRect();
      const newX = Math.max(
        0,
        Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)
      );
      const newY = Math.max(
        0,
        Math.min(100, ((e.clientY - rect.top) / rect.height) * 100)
      );

      setPegmanPosition({ x: newX, y: newY });

      // Update camera rotation based on pegman position
      const rotY = (newX / 100 - 0.5) * Math.PI * 2;
      const rotX = (newY / 100 - 0.5) * Math.PI;

      targetRotationRef.current.y = rotY;
      targetRotationRef.current.x = Math.max(
        -Math.PI / 2,
        Math.min(Math.PI / 2, rotX)
      );
      setCompassRotation(-rotY * (180 / Math.PI));
    },
    [isDraggingPegman]
  );

  const handlePegmanMouseUp = useCallback(() => {
    setIsDraggingPegman(false);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowLeft":
          targetRotationRef.current.y -= 0.1;
          setCompassRotation(-targetRotationRef.current.y * (180 / Math.PI));
          break;
        case "ArrowRight":
          targetRotationRef.current.y += 0.1;
          setCompassRotation(-targetRotationRef.current.y * (180 / Math.PI));
          break;
        case "ArrowUp":
          targetRotationRef.current.x = Math.min(
            Math.PI / 2,
            targetRotationRef.current.x + 0.1
          );
          break;
        case "ArrowDown":
          targetRotationRef.current.x = Math.max(
            -Math.PI / 2,
            targetRotationRef.current.x - 0.1
          );
          break;
        case "+":
        case "=":
          handleZoomIn();
          break;
        case "-":
          handleZoomOut();
          break;
        case "Escape":
          if (showMiniMap) {
            closeMiniMap();
          } else {
            handleClose();
          }
          break;
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".context-menu")) {
        setShowContextMenu(false);
      }
    };

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isDraggingPegman) {
        const mapElement = document.querySelector(".mini-map-container");
        if (mapElement) {
          const rect = mapElement.getBoundingClientRect();
          const newX = Math.max(
            0,
            Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)
          );
          const newY = Math.max(
            0,
            Math.min(100, ((e.clientY - rect.top) / rect.height) * 100)
          );

          setPegmanPosition({ x: newX, y: newY });

          const rotY = (newX / 100 - 0.5) * Math.PI * 2;
          const rotX = (newY / 100 - 0.5) * Math.PI;

          targetRotationRef.current.y = rotY;
          targetRotationRef.current.x = Math.max(
            -Math.PI / 2,
            Math.min(Math.PI / 2, rotX)
          );
          setCompassRotation(-rotY * (180 / Math.PI));
        }
      }
    };

    const handleGlobalMouseUp = () => {
      setIsDraggingPegman(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("click", handleClickOutside);
    window.addEventListener("mousemove", handleGlobalMouseMove);
    window.addEventListener("mouseup", handleGlobalMouseUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("click", handleClickOutside);
      window.removeEventListener("mousemove", handleGlobalMouseMove);
      window.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [showMiniMap, isDraggingPegman]);

  // Satellite view background style
  const satelliteStyle = {
    backgroundImage: `
      radial-gradient(circle at 20% 30%, #1e3a8a 0%, #1e40af 25%, #2563eb 50%),
      radial-gradient(circle at 80% 20%, #0ea5e9 0%, #38bdf8 30%),
      linear-gradient(180deg, #0c4a6e 0%, #0369a1 20%, #0284c7 40%, #06b6d4 60%, #fbbf24 70%, #f59e0b 80%, #84cc16 90%, #65a30d 100%)
    `,
    backgroundSize: "100% 40%, 100% 30%, 100% 100%",
    backgroundPosition: "0% 0%, 0% 0%, 0% 0%",
    backgroundBlendMode: "overlay, multiply, normal",
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black select-none">
      <div
        ref={containerRef}
        className="absolute inset-0"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
        onContextMenu={handleContextMenu}
        style={{
          cursor: isDragging ? "grabbing" : "grab",
        }}
      />

      {/* Context Menu */}
      {showContextMenu && (
        <div
          className="context-menu absolute z-50 bg-white rounded-lg shadow-xl py-2 min-w-[200px]"
          style={{
            left: contextMenuPosition.x,
            top: contextMenuPosition.y,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-4 py-2 text-sm text-gray-700 font-medium border-b">
            360° View Options
          </div>

          <button
            onClick={() => {
              if (document.fullscreenEnabled && containerRef.current) {
                containerRef.current.requestFullscreen().catch((err) => {
                  console.log("Fullscreen failed:", err);
                  alert("Fullscreen not supported or blocked");
                });
              } else {
                alert("Fullscreen not supported by your browser");
              }
              setShowContextMenu(false);
            }}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
          >
            Fullscreen
          </button>

          <div className="border-t my-1"></div>

          <div className="px-4 py-2 text-xs text-gray-500 font-medium">
            Change View Mode
          </div>

          {["normal", "fisheye", "stereographic", "littlePlanet"].map(
            (mode) => (
              <button
                key={mode}
                onClick={() => handleViewModeChange(mode as any)}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 cursor-pointer ${
                  viewMode === mode
                    ? "bg-blue-50 text-blue-600"
                    : "text-gray-700"
                }`}
              >
                {mode.charAt(0).toUpperCase() +
                  mode
                    .slice(1)
                    .replace(/([A-Z])/g, " $1")
                    .trim()}{" "}
                View
              </button>
            )
          )}
        </div>
      )}

      {/* Top navigation bar */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-20 pointer-events-auto">
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={handleClose}
            className="p-2 text-white hover:bg-white/20 rounded-full transition-colors cursor-pointer"
            title="Go back"
          >
            <svg
              className="w-5 h-5 sm:w-6 sm:h-6"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
            </svg>
          </button>

          <div className="relative hidden sm:block">
            <div
              className={`flex items-center bg-white rounded-full shadow-lg transition-all duration-200 ${
                isSearchFocused ? "ring-2 ring-blue-500" : ""
              }`}
            >
              <svg
                className="ml-4 text-gray-600"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
              </svg>
              <input
                type="text"
                placeholder="Search Google Maps"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch(e)}
                className="bg-transparent text-gray-900 placeholder-gray-500 px-4 py-3 w-48 md:w-64 lg:w-80 focus:outline-none"
              />
              <div className="mr-3 p-1.5 bg-blue-500 rounded-md">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                  <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71L12 2z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: "360° Lofoten Beach - Contract Address",
                  text: "Check out this 360° beach view with contract address!",
                  url: window.location.href,
                });
              } else {
                navigator.clipboard.writeText(window.location.href);
                alert("Link copied to clipboard!");
              }
            }}
            className="flex items-center gap-2 bg-gray-700/80 hover:bg-gray-700 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-full transition-colors backdrop-blur-sm cursor-pointer"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16,6 12,2 8,6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
            <span className="text-sm font-medium hidden sm:inline">Share</span>
          </button>

          <button
            onClick={handleClose}
            className="p-2 sm:p-2.5 text-white hover:bg-white/20 rounded-full transition-colors cursor-pointer"
            title="Close Street View"
          >
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Location info overlay */}
      <div className="absolute top-20 left-4 z-20 pointer-events-none">
        <div className="bg-gray-900/90 text-white px-4 py-2 rounded-lg backdrop-blur-sm">
          <div className="text-base sm:text-lg font-medium">
            360° Lofoten Beach
          </div>
          <div className="text-xs sm:text-sm text-gray-300">
            Turquoise Waves • Arctic Norway •{" "}
            {viewMode.charAt(0).toUpperCase() +
              viewMode
                .slice(1)
                .replace(/([A-Z])/g, " $1")
                .trim()}{" "}
            View
          </div>
        </div>
      </div>

      {/* Right side controls container */}
      <div className="absolute right-4 bottom-20 z-20 flex flex-col items-center gap-3 pointer-events-auto">
        <button
          onClick={() => {
            targetRotationRef.current = { x: 0, y: 0 };
            rotationRef.current = { x: 0, y: 0 };
            setCompassRotation(0);
            setZoom(1);
          }}
          className="group relative w-12 h-12 bg-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer"
          title="Reset view to center"
        >
          <div className="absolute inset-0 rounded-full overflow-hidden">
            <div className="absolute inset-0 rounded-full bg-gradient-to-b from-gray-50 to-white"></div>
            <div
              className="absolute inset-1 rounded-full bg-white flex items-center justify-center"
              style={{
                transform: `rotate(${compassRotation}deg)`,
                transition:
                  isDragging || touchStart ? "none" : "transform 0.3s ease",
              }}
            >
              <div className="relative w-full h-full">
                <div
                  className="absolute top-0 left-1/2 transform -translate-x-1/2 w-0 h-0"
                  style={{
                    borderLeft: "4px solid transparent",
                    borderRight: "4px solid transparent",
                    borderBottom: "16px solid #EA4335",
                    marginTop: "3px",
                  }}
                ></div>
                <div
                  className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-0 h-0"
                  style={{
                    borderLeft: "4px solid transparent",
                    borderRight: "4px solid transparent",
                    borderTop: "16px solid #5F6368",
                    marginBottom: "3px",
                  }}
                ></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-gray-700 rounded-full"></div>
              </div>
            </div>
          </div>
        </button>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <button
            onClick={handleZoomIn}
            className="block p-2.5 sm:p-3 text-gray-700 hover:bg-gray-100 transition-colors border-b border-gray-200 cursor-pointer"
            title="Zoom in (+)"
          >
            <svg
              className="w-4 h-4 sm:w-[18px] sm:h-[18px]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          <button
            onClick={handleZoomOut}
            className="block p-2.5 sm:p-3 text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
            title="Zoom out (-)"
          >
            <svg
              className="w-4 h-4 sm:w-[18px] sm:h-[18px]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
      </div>

      {/* GOOGLE MAPS STYLE Mini Map */}
      <div
        className={`mini-map-container absolute bottom-4 left-4 bg-white rounded-lg shadow-xl overflow-hidden z-20 border-2 border-gray-300 transition-all duration-300 cursor-pointer ${
          isMapHovered ? "w-80 h-60" : "w-24 h-20 sm:w-32 sm:h-24"
        }`}
        onMouseEnter={() => setIsMapHovered(true)}
        onMouseLeave={() => setIsMapHovered(false)}
        onClick={handleMiniMapClick}
      >
        {isMapHovered ? (
          <div className="relative w-full h-full">
            {/* Clean Google Maps Style Background */}
            <div
              className="absolute inset-0"
              style={{
                transform: `scale(${mapZoom})`,
                transformOrigin: "center",
              }}
            >
              {/* Ocean - clean blue */}
              <div className="w-full h-[50%] bg-blue-500"></div>

              {/* Beach - clean tan/beige */}
              <div className="w-full h-[25%] bg-yellow-200"></div>

              {/* Land/Grass - clean green */}
              <div className="w-full h-[25%] bg-green-400"></div>

              {/* Simple coastline */}
              <div className="absolute top-[50%] left-0 right-0 h-px bg-white opacity-60"></div>
              <div className="absolute top-[75%] left-0 right-0 h-px bg-gray-300 opacity-40"></div>

              {/* Street View Coverage - Blue lines like Google Maps */}
              <div className="absolute inset-0 z-10">
                {/* Main road with Street View */}
                <div className="absolute top-[85%] left-0 right-0 h-1.5 bg-blue-600 opacity-90"></div>

                {/* Beach access points */}
                <div className="absolute top-[75%] left-[25%] w-1.5 h-[10%] bg-blue-600 opacity-80"></div>
                <div className="absolute top-[75%] left-[50%] w-1.5 h-[10%] bg-blue-600 opacity-80"></div>
                <div className="absolute top-[75%] left-[75%] w-1.5 h-[10%] bg-blue-600 opacity-80"></div>

                {/* Viewpoint coverage along beach */}
                <div className="absolute top-[70%] left-[20%] w-[15%] h-1.5 bg-blue-600 opacity-75"></div>
                <div className="absolute top-[70%] left-[42%] w-[16%] h-1.5 bg-blue-600 opacity-75"></div>
                <div className="absolute top-[70%] left-[65%] w-[15%] h-1.5 bg-blue-600 opacity-75"></div>
              </div>

              {/* Camera position - Google style red dot */}
              <div
                className="absolute w-4 h-4 transform -translate-x-1/2 -translate-y-1/2 z-20"
                style={{ top: "70%", left: "50%" }}
              >
                <div className="absolute inset-0 bg-red-500 rounded-full border-2 border-white shadow-lg"></div>
              </div>

              {/* Pegman - Google style yellow figure */}
              <div
                className="absolute w-5 h-5 transform -translate-x-1/2 -translate-y-1/2 z-30 cursor-grab hover:cursor-grabbing"
                style={{
                  left: `${pegmanPosition.x}%`,
                  top: `${pegmanPosition.y}%`,
                  cursor: isDraggingPegman ? "grabbing" : "grab",
                }}
                onMouseDown={handlePegmanMouseDown}
                title="Drag to explore"
              >
                <div
                  className={`${
                    isDraggingPegman ? "scale-110" : ""
                  } transition-transform`}
                >
                  {/* Google Pegman style */}
                  <div className="w-4 h-4 bg-yellow-400 rounded-full border-2 border-white shadow-md flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Zoom Controls - Google Maps style */}
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white rounded shadow-lg overflow-hidden z-40">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleMapZoomIn();
                }}
                className="block p-2 text-gray-700 hover:bg-gray-100 transition-colors border-b border-gray-200"
                title="Zoom in"
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleMapZoomOut();
                }}
                className="block p-2 text-gray-700 hover:bg-gray-100 transition-colors"
                title="Zoom out"
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            </div>

            {/* Location label - Google Maps style */}
            <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded z-30">
              Lofoten Beach, Norway
            </div>

            {/* Compass - Simple Google style */}
            <div className="absolute top-2 right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-md z-30">
              <div
                className="text-red-500 font-bold text-xs"
                style={{
                  transform: `rotate(${compassRotation}deg)`,
                  transition:
                    isDragging || touchStart ? "none" : "transform 0.3s ease",
                }}
              >
                N
              </div>
            </div>

            {/* Satellite label */}
            <div className="absolute bottom-2 right-2 text-xs text-white bg-black bg-opacity-50 px-1 rounded z-30">
              Satellite
            </div>
          </div>
        ) : (
          /* Collapsed mini map - Clean Google style */
          <div className="w-full h-full relative cursor-pointer overflow-hidden">
            {/* Simple collapsed view */}
            <div className="absolute inset-0">
              <div className="w-full h-[50%] bg-blue-500"></div>
              <div className="w-full h-[25%] bg-yellow-200"></div>
              <div className="w-full h-[25%] bg-green-400"></div>

              {/* Street View lines in collapsed state */}
              <div className="absolute top-[85%] left-0 right-0 h-0.5 bg-blue-600 opacity-80"></div>
              <div className="absolute top-[70%] left-[25%] w-0.5 h-[15%] bg-blue-600 opacity-70"></div>
              <div className="absolute top-[70%] left-[50%] w-0.5 h-[15%] bg-blue-600 opacity-70"></div>
              <div className="absolute top-[70%] left-[75%] w-0.5 h-[15%] bg-blue-600 opacity-70"></div>
            </div>

            <div className="absolute top-[70%] left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="w-2 h-2 bg-red-500 rounded-full border border-white shadow-sm"></div>
            </div>

            <div className="absolute bottom-0.5 right-0.5 text-xs opacity-70">
              🗺️
            </div>
          </div>
        )}
      </div>

      {/* Google logo */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20 pointer-events-none">
        <div className="text-lg sm:text-2xl font-normal tracking-tight drop-shadow-lg">
          <span className="text-blue-400">G</span>
          <span className="text-red-400">o</span>
          <span className="text-yellow-400">o</span>
          <span className="text-blue-400">g</span>
          <span className="text-green-400">l</span>
          <span className="text-red-400">e</span>
        </div>
      </div>

      {/* Bottom right info */}
      <div className="absolute bottom-2 right-4 text-[10px] sm:text-xs text-black/80 z-20 space-x-1 hidden sm:block pointer-events-none">
        <span>360° Video Experience</span>
        <span>•</span>
        <span>Drag to explore</span>
        <span>•</span>
        <span>Hover map to expand</span>
        <span>•</span>
        <span>Drag Pegman around</span>
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        .pulse-ring {
          box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
          animation: pulse-ring 2s infinite;
        }

        @keyframes pulse-ring {
          0% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
          }
          70% {
            transform: scale(1);
            box-shadow: 0 0 0 8px rgba(239, 68, 68, 0);
          }
          100% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
          }
        }

        .pegman-body {
          animation: pegman-idle 3s ease-in-out infinite;
        }

        @keyframes pegman-idle {
          0%,
          100% {
            transform: translateY(0px) scale(1);
          }
          50% {
            transform: translateY(-2px) scale(1.05);
          }
        }
      `}</style>
    </div>
  );
};

export default GoogleStreetView360;
