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

    // Copy the container reference for cleanup
    const container = containerRef.current;

    // Create scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Create camera
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 0.1);
    cameraRef.current = camera;

    // Create renderer
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

    // Create video element
    const video = document.createElement("video");
    video.src = video360Url;
    video.crossOrigin = "anonymous";
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;
    videoRef.current = video;

    // Create video texture
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

    // Create material with video texture
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

    // Create mesh
    const sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);
    sphereRef.current = sphere;

    // Start video playback
    video.play().catch((err) => {
      console.log("Video playback failed, trying on user interaction", err);
    });

    // Animation loop
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);

      // Smooth rotation
      rotationRef.current.x +=
        (targetRotationRef.current.x - rotationRef.current.x) * 0.1;
      rotationRef.current.y +=
        (targetRotationRef.current.y - rotationRef.current.y) * 0.1;

      // Apply rotation to camera
      camera.rotation.x = rotationRef.current.x;
      camera.rotation.y = rotationRef.current.y;

      renderer.render(scene, camera);
    };
    animate();

    // Handle window resize
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
      setDragStart({
        x: e.clientX,
        y: e.clientY,
      });
    }
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;

      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;

      // Update target rotation
      targetRotationRef.current.y -= deltaX * 0.002;
      targetRotationRef.current.x -= deltaY * 0.002;

      // Clamp vertical rotation
      targetRotationRef.current.x = Math.max(
        -Math.PI / 2,
        Math.min(Math.PI / 2, targetRotationRef.current.x)
      );

      // Update compass
      setCompassRotation(-targetRotationRef.current.y * (180 / Math.PI));

      // Update drag start for next frame
      setDragStart({
        x: e.clientX,
        y: e.clientY,
      });
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

    // Reset rotation for little planet view
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

  const handleClose = () => {
    if (typeof window !== "undefined") {
      window.history.back();
    }
  };

  const toggleMiniMap = () => {
    setShowMiniMap(!showMiniMap);
  };

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  }, []);

  // Touch handlers
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

      targetRotationRef.current.y -= deltaX * 0.002;
      targetRotationRef.current.x -= deltaY * 0.002;

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowLeft":
          targetRotationRef.current.y += 0.1;
          setCompassRotation(-targetRotationRef.current.y * (180 / Math.PI));
          break;
        case "ArrowRight":
          targetRotationRef.current.y -= 0.1;
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
          handleClose();
          break;
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".context-menu")) {
        setShowContextMenu(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("click", handleClickOutside);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("click", handleClickOutside);
    };
  }, []);

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
                containerRef.current.requestFullscreen();
              }
              setShowContextMenu(false);
            }}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            Fullscreen
          </button>

          <div className="border-t my-1"></div>

          <div className="px-4 py-2 text-xs text-gray-500 font-medium">
            Change View Mode
          </div>

          <button
            onClick={() => handleViewModeChange("normal")}
            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
              viewMode === "normal"
                ? "bg-blue-50 text-blue-600"
                : "text-gray-700"
            }`}
          >
            Normal View
          </button>

          <button
            onClick={() => handleViewModeChange("fisheye")}
            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
              viewMode === "fisheye"
                ? "bg-blue-50 text-blue-600"
                : "text-gray-700"
            }`}
          >
            Fisheye View
          </button>

          <button
            onClick={() => handleViewModeChange("stereographic")}
            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
              viewMode === "stereographic"
                ? "bg-blue-50 text-blue-600"
                : "text-gray-700"
            }`}
          >
            Wide Angle View
          </button>

          <button
            onClick={() => handleViewModeChange("littlePlanet")}
            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
              viewMode === "littlePlanet"
                ? "bg-blue-50 text-blue-600"
                : "text-gray-700"
            }`}
          >
            Little Planet View
          </button>
        </div>
      )}

      {/* Top navigation bar */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-20 pointer-events-auto">
        {/* Left side */}
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={handleClose}
            className="p-2 text-white hover:bg-white/20 rounded-full transition-colors"
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

          {/* Search bar */}
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

        {/* Right side controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button className="flex items-center gap-2 bg-gray-700/80 hover:bg-gray-700 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-full transition-colors backdrop-blur-sm">
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
            className="p-2 sm:p-2.5 text-white hover:bg-white/20 rounded-full transition-colors"
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

      <div className="absolute top-20 right-4 z-20 pointer-events-none">
        <div className="bg-gray-900/90 text-white px-3 py-1 rounded-lg backdrop-blur-sm text-sm">
          Zoom: {Math.round(zoom * 100)}%
        </div>
      </div>

      {/* Right side controls container */}
      <div className="absolute right-4 bottom-20 z-20 flex flex-col items-center gap-3 pointer-events-auto">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <button
            onClick={handleZoomIn}
            className="block p-2.5 sm:p-3 text-gray-700 hover:bg-gray-100 transition-colors border-b border-gray-200"
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
            className="block p-2.5 sm:p-3 text-gray-700 hover:bg-gray-100 transition-colors"
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

        <button
          onClick={() => {
            targetRotationRef.current = { x: 0, y: 0 };
            rotationRef.current = { x: 0, y: 0 };
            setCompassRotation(0);
            setZoom(1);
          }}
          className="group relative w-12 h-12 bg-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200"
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
            <div className="absolute inset-0 rounded-full bg-gray-100 opacity-0 group-hover:opacity-10 transition-opacity"></div>
          </div>
        </button>
      </div>

      {/* Mini Map */}
      <div
        className={`absolute bottom-4 left-4 bg-white rounded-lg shadow-lg overflow-hidden z-20 border transition-all duration-300 pointer-events-auto ${
          showMiniMap ? "w-64 h-48" : "w-24 h-20 sm:w-32 sm:h-24"
        }`}
      >
        <div className="w-full h-full bg-green-100 relative">
          <div className="absolute inset-1 bg-gradient-to-br from-green-200 to-green-300 rounded"></div>

          {showMiniMap && (
            <div className="absolute inset-2 bg-white rounded overflow-hidden">
              <div className="w-full h-full bg-gradient-to-br from-blue-100 to-green-100 relative">
                <div className="absolute inset-0">
                  {[...Array(8)].map((_, i) => (
                    <div
                      key={`v-${i}`}
                      className="absolute bg-gray-300"
                      style={{
                        left: `${12.5 * (i + 1)}%`,
                        top: "10%",
                        width: "1px",
                        height: "80%",
                      }}
                    ></div>
                  ))}
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={`h-${i}`}
                      className="absolute bg-gray-300"
                      style={{
                        top: `${16.67 * (i + 1)}%`,
                        left: "10%",
                        height: "1px",
                        width: "80%",
                      }}
                    ></div>
                  ))}
                </div>

                <div
                  className="absolute w-3 h-3 bg-blue-500 rounded-full border-2 border-white shadow-sm"
                  style={{
                    top: "50%",
                    left: "50%",
                    transform: `translate(-50%, -50%) rotate(${-compassRotation}deg)`,
                  }}
                >
                  <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-b-3 border-transparent border-b-red-500"></div>
                </div>
              </div>
            </div>
          )}

          {!showMiniMap && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-blue-500 rounded-full border-2 border-white shadow-sm"></div>
          )}

          <button
            onClick={toggleMiniMap}
            className="absolute bottom-1 right-1 p-0.5 sm:p-1 hover:bg-white/80 rounded transition-colors"
            title={showMiniMap ? "Collapse map" : "Expand map"}
          >
            <svg
              className="w-3 h-3"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              {showMiniMap ? (
                <>
                  <polyline points="9,9 3,9 3,15" />
                  <polyline points="15,15 21,15 21,9" />
                  <line x1="21" y1="3" x2="14" y2="10" />
                  <line x1="3" y1="21" x2="10" y2="14" />
                </>
              ) : (
                <>
                  <polyline points="15,3 21,3 21,9" />
                  <polyline points="9,21 3,21 3,15" />
                  <line x1="21" y1="3" x2="14" y2="10" />
                  <line x1="3" y1="21" x2="10" y2="14" />
                </>
              )}
            </svg>
          </button>
        </div>
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
      <div className="absolute bottom-2 right-4 text-[10px] sm:text-xs text-white/80 z-20 space-x-1 hidden sm:block pointer-events-none">
        <span>360° Video Experience</span>
        <span>•</span>
        <span>Drag to explore</span>
        <span>•</span>
        <span>Wheel to zoom</span>
        <span>•</span>
        <span>Auto-playing</span>
      </div>
    </div>
  );
};

export default GoogleStreetView360;
