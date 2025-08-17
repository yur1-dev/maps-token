"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

const GoogleMaps = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({
    x: 0,
    y: 0,
  });
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const moonRef = useRef<THREE.Group | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const isUserInteractingRef = useRef(false);
  const starFieldRef = useRef<{
    stars: THREE.Points;
    brightStars: THREE.Points;
  } | null>(null);

  const handleSearch = (e: React.KeyboardEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Mock search results for moon features
      const moonFeatures = [
        "Mare Tranquillitatis (Sea of Tranquility)",
        "Tycho Crater",
        "Copernicus Crater",
        "Mare Imbrium (Sea of Rains)",
        "Apollo 11 Landing Site",
        "Oceanus Procellarum",
        "Mare Serenitatis",
        "Kepler Crater",
        "Aristarchus Crater",
        "Mare Crisium",
      ];

      const filtered = moonFeatures.filter((feature) =>
        feature.toLowerCase().includes(searchQuery.toLowerCase())
      );

      setSearchResults(
        filtered.length > 0 ? filtered : ["No lunar features found"]
      );
      setShowSearchResults(true);
    }
  };

  const handleSearchResultClick = (result: string) => {
    setSearchQuery(result);
    setShowSearchResults(false);
    // Simulate moving to location
    if (controlsRef.current && moonRef.current) {
      const randomRotation = Math.random() * Math.PI * 2;
      moonRef.current.rotation.y = randomRotation;
    }
  };

  const handleMinimapClick = (e: React.MouseEvent) => {
    if (!controlsRef.current || !cameraRef.current) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Convert click position to normalized coordinates
    const normalizedX = (x / rect.width - 0.5) * 2;
    const normalizedY = (y / rect.height - 0.5) * 2;

    // Update camera position based on minimap click
    const azimuth = normalizedX * Math.PI;
    const elevation = -normalizedY * Math.PI * 0.3; // Limit elevation range

    const distance = cameraRef.current.position.length();
    const newX = distance * Math.cos(elevation) * Math.sin(azimuth);
    const newY = distance * Math.sin(elevation);
    const newZ = distance * Math.cos(elevation) * Math.cos(azimuth);

    // Smoothly move camera to new position
    const startPos = cameraRef.current.position.clone();
    const endPos = new THREE.Vector3(newX, newY, newZ);

    // Simple animation
    let progress = 0;
    const animate = () => {
      progress += 0.1;
      if (progress <= 1) {
        const currentPos = startPos.clone().lerp(endPos, progress);
        cameraRef.current!.position.copy(currentPos);
        controlsRef.current!.update();
        requestAnimationFrame(animate);
      }
    };
    animate();
  };

  // Fixed star positions for consistent SSR
  const getFixedStarPositions = () => {
    const positions = [];
    const seed = 12345; // Fixed seed for consistency
    let random = seed;

    for (let i = 0; i < 15; i++) {
      // Simple pseudo-random generator for consistent results
      random = (random * 9301 + 49297) % 233280;
      const x = (random / 233280) * 100;

      random = (random * 9301 + 49297) % 233280;
      const y = (random / 233280) * 100;

      positions.push({ left: `${x}%`, top: `${y}%` });
    }

    return positions;
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowContextMenu(true);
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
  };

  const handleFullscreen = () => {
    if (document.fullscreenEnabled && containerRef.current) {
      containerRef.current.requestFullscreen().catch((err) => {
        console.log("Fullscreen failed:", err);
        alert("Fullscreen not supported or blocked");
      });
    } else {
      alert("Fullscreen not supported by your browser");
    }
    setShowContextMenu(false);
  };

  // Create text geometry that appears on the Moon surface
  const createTextOnSurface = (
    text: string,
    position: THREE.Vector3,
    scene: THREE.Scene,
    fontSize: number = 0.05
  ) => {
    // Create text using a canvas
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d")!;
    canvas.width = 2048;
    canvas.height = 256;

    // Clear canvas first
    context.clearRect(0, 0, canvas.width, canvas.height);

    // Set text style for better centering
    context.fillStyle = "#ffffff";
    context.font = `bold ${fontSize * 1000}px Arial, sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.shadowColor = "#000000";
    context.shadowBlur = 15;
    context.shadowOffsetX = 3;
    context.shadowOffsetY = 3;

    // Draw text at exact center
    context.fillText(text, canvas.width / 2, canvas.height / 2);

    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    texture.flipY = true;

    // Create material
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.1,
      side: THREE.DoubleSide,
    });

    // Create geometry with better proportions for closer text
    const geometry = new THREE.PlaneGeometry(1.6, 0.2);
    const textMesh = new THREE.Mesh(geometry, material);

    // Position the text correctly in front of the moon
    textMesh.position.copy(position);

    // Make text face the camera properly
    textMesh.lookAt(cameraRef.current?.position || new THREE.Vector3(0, 0, 5));

    scene.add(textMesh);
    return textMesh;
  };

  // Create simple but beautiful star field without custom shaders
  const createStarField = (scene: THREE.Scene) => {
    // Create a simple circular texture for stars
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 32;
    const context = canvas.getContext("2d")!;

    // Draw a simple white circle with soft edges
    const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
    gradient.addColorStop(0.4, "rgba(255, 255, 255, 0.8)");
    gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

    context.fillStyle = gradient;
    context.fillRect(0, 0, 32, 32);

    const starTexture = new THREE.CanvasTexture(canvas);

    // Create star geometry
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 4000;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      // Generate random positions on a large sphere
      const radius = 400;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      // Simple white colors with slight variations
      const brightness = 0.7 + Math.random() * 0.3;
      colors[i * 3] = brightness;
      colors[i * 3 + 1] = brightness;
      colors[i * 3 + 2] = brightness;
    }

    starGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3)
    );
    starGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    // Use simple PointsMaterial with the texture
    const starMaterial = new THREE.PointsMaterial({
      size: 2,
      map: starTexture,
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });

    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

    // Add some brighter stars
    const brightStarGeometry = new THREE.BufferGeometry();
    const brightStarCount = 300;
    const brightPositions = new Float32Array(brightStarCount * 3);
    const brightColors = new Float32Array(brightStarCount * 3);

    for (let i = 0; i < brightStarCount; i++) {
      const radius = 350;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      brightPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      brightPositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      brightPositions[i * 3 + 2] = radius * Math.cos(phi);

      brightColors[i * 3] = 1.0;
      brightColors[i * 3 + 1] = 1.0;
      brightColors[i * 3 + 2] = 1.0;
    }

    brightStarGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(brightPositions, 3)
    );
    brightStarGeometry.setAttribute(
      "color",
      new THREE.BufferAttribute(brightColors, 3)
    );

    const brightStarMaterial = new THREE.PointsMaterial({
      size: 4,
      map: starTexture,
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });

    const brightStars = new THREE.Points(
      brightStarGeometry,
      brightStarMaterial
    );
    scene.add(brightStars);

    console.log(
      "Star field created successfully with",
      starCount + brightStarCount,
      "stars"
    );

    return { stars, brightStars };
  };

  // Enhanced procedural moon creation - now the primary method
  const createProceduralMoon = useCallback(() => {
    try {
      console.log("Creating procedural Moon...");
      
      // Create moon geometry with higher detail
      const moonGeometry = new THREE.SphereGeometry(1, 128, 64);

      // Create realistic moon texture using canvas with enhanced detail
      const canvas = document.createElement("canvas");
      canvas.width = 2048;
      canvas.height = 1024;
      const ctx = canvas.getContext("2d")!;

      // Base moon color with realistic gradients
      const gradient = ctx.createRadialGradient(
        canvas.width * 0.3, canvas.height * 0.3, 0,
        canvas.width * 0.5, canvas.height * 0.5, canvas.width * 0.7
      );
      gradient.addColorStop(0, "#c4c4c4");
      gradient.addColorStop(0.3, "#b8b8b8");
      gradient.addColorStop(0.6, "#a0a0a0");
      gradient.addColorStop(1, "#888888");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Add realistic lunar maria (dark areas)
      const maria = [
        { x: 400, y: 300, w: 200, h: 160, darkness: 0.4, name: "Mare Tranquillitatis" },
        { x: 800, y: 200, w: 180, h: 140, darkness: 0.35, name: "Mare Imbrium" },
        { x: 1200, y: 400, w: 120, h: 100, darkness: 0.45, name: "Mare Serenitatis" },
        { x: 300, y: 600, w: 140, h: 120, darkness: 0.4, name: "Mare Crisium" },
        { x: 1400, y: 300, w: 160, h: 140, darkness: 0.3, name: "Oceanus Procellarum" },
        { x: 600, y: 100, w: 100, h: 80, darkness: 0.35, name: "Mare Serenitatis" },
      ];

      maria.forEach((mare) => {
        const mariaGradient = ctx.createRadialGradient(
          mare.x, mare.y, 0,
          mare.x, mare.y, Math.max(mare.w, mare.h)
        );
        mariaGradient.addColorStop(0, `rgba(0, 0, 0, ${mare.darkness})`);
        mariaGradient.addColorStop(0.7, `rgba(0, 0, 0, ${mare.darkness * 0.7})`);
        mariaGradient.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = mariaGradient;
        ctx.ellipse(mare.x, mare.y, mare.w/2, mare.h/2, 0, 0, Math.PI * 2);
        ctx.fill();
      });

      // Add major craters with realistic details
      const majorCraters = [
        { x: 1600, y: 700, size: 60, darkness: 0.6, name: "Tycho" },
        { x: 1000, y: 600, size: 45, darkness: 0.5, name: "Copernicus" },
        { x: 500, y: 500, size: 35, darkness: 0.45, name: "Kepler" },
        { x: 1300, y: 500, size: 50, darkness: 0.55, name: "Aristarchus" },
        { x: 700, y: 300, size: 40, darkness: 0.5, name: "Plato" },
      ];

      majorCraters.forEach((crater) => {
        // Main crater
        const craterGradient = ctx.createRadialGradient(
          crater.x, crater.y, 0,
          crater.x, crater.y, crater.size
        );
        craterGradient.addColorStop(0, `rgba(0, 0, 0, ${crater.darkness})`);
        craterGradient.addColorStop(0.6, `rgba(0, 0, 0, ${crater.darkness * 0.8})`);
        craterGradient.addColorStop(0.9, `rgba(0, 0, 0, ${crater.darkness * 0.3})`);
        craterGradient.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = craterGradient;
        ctx.beginPath();
        ctx.arc(crater.x, crater.y, crater.size, 0, Math.PI * 2);
        ctx.fill();

        // Crater rim highlight
        const rimGradient = ctx.createRadialGradient(
          crater.x, crater.y, crater.size * 0.8,
          crater.x, crater.y, crater.size * 1.2
        );
        rimGradient.addColorStop(0, "rgba(255, 255, 255, 0)");
        rimGradient.addColorStop(0.5, "rgba(255, 255, 255, 0.1)");
        rimGradient.addColorStop(1, "rgba(255, 255, 255, 0)");
        ctx.fillStyle = rimGradient;
        ctx.beginPath();
        ctx.arc(crater.x, crater.y, crater.size * 1.2, 0, Math.PI * 2);
        ctx.fill();
      });

      // Add hundreds of smaller craters for realism
      for (let i = 0; i < 200; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const size = Math.random() * 25 + 3;
        const darkness = Math.random() * 0.4 + 0.2;

        const craterGradient = ctx.createRadialGradient(x, y, 0, x, y, size);
        craterGradient.addColorStop(0, `rgba(0, 0, 0, ${darkness})`);
        craterGradient.addColorStop(0.7, `rgba(0, 0, 0, ${darkness * 0.5})`);
        craterGradient.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = craterGradient;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }

      // Add surface texture details
      for (let i = 0; i < 1000; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const size = Math.random() * 3 + 1;
        const opacity = Math.random() * 0.2 + 0.1;

        ctx.fillStyle = `rgba(0, 0, 0, ${opacity})`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }

      // Create texture from canvas
      const moonTexture = new THREE.CanvasTexture(canvas);
      moonTexture.needsUpdate = true;

      // Create enhanced normal map for surface detail
      const normalCanvas = document.createElement("canvas");
      normalCanvas.width = 1024;
      normalCanvas.height = 512;
      const normalCtx = normalCanvas.getContext("2d")!;

      // Base normal map color (neutral)
      normalCtx.fillStyle = "#8080ff";
      normalCtx.fillRect(0, 0, normalCanvas.width, normalCanvas.height);

      // Add surface variations for normal mapping
      for (let i = 0; i < 500; i++) {
        const x = Math.random() * normalCanvas.width;
        const y = Math.random() * normalCanvas.height;
        const size = Math.random() * 30 + 5;
        const intensity = Math.random() * 0.3 + 0.1;

        const normalGradient = normalCtx.createRadialGradient(
          x, y, 0, x, y, size
        );
        normalGradient.addColorStop(0, `rgba(96, 96, 255, ${intensity})`);
        normalGradient.addColorStop(1, "rgba(128, 128, 255, 0)");
        normalCtx.fillStyle = normalGradient;
        normalCtx.beginPath();
        normalCtx.arc(x, y, size, 0, Math.PI * 2);
        normalCtx.fill();
      }

      const normalTexture = new THREE.CanvasTexture(normalCanvas);
      normalTexture.needsUpdate = true;

      // Create enhanced moon material
      const moonMaterial = new THREE.MeshStandardMaterial({
        map: moonTexture,
        normalMap: normalTexture,
        normalScale: new THREE.Vector2(0.5, 0.5),
        roughness: 0.9,
        metalness: 0.0,
        color: new THREE.Color(0xffffff),
      });

      // Create moon mesh
      const moonMesh = new THREE.Mesh(moonGeometry, moonMaterial);
      const moonGroup = new THREE.Group();
      moonGroup.add(moonMesh);

      sceneRef.current!.add(moonGroup);
      moonRef.current = moonGroup;

      // Add text on the Moon surface
      createTextOnSurface(
        "742d35Cc6634C0532925a3b8D63C4e64c6A6E6E2",
        new THREE.Vector3(-0.09, 0.15, 1.05),
        sceneRef.current!,
        0.04
      );

      createTextOnSurface(
        "Pump.fun",
        new THREE.Vector3(-0.15, -0.05, 1.05),
        sceneRef.current!,
        0.035
      );

      console.log("Enhanced procedural Moon created successfully!");
      return true;
    } catch (error) {
      console.error("Failed to create procedural moon:", error);
      return false;
    }
  };

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 5);
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    // Create star field first
    const starField = createStarField(scene);
    starFieldRef.current = starField;

    // Lighting - much brighter to match Google Earth appearance
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 2.0);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    // Add additional lighting for bright Moon appearance
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
    keyLight.position.set(-5, 3, 2);
    scene.add(keyLight);

    // Add fill light to eliminate dark areas
    const fillLight = new THREE.DirectionalLight(0xffffff, 1.0);
    fillLight.position.set(0, -5, 0);
    scene.add(fillLight);

    // Load OrbitControls dynamically
    const loadControls = async () => {
      try {
        // Use dynamic import to avoid SSR issues
        const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');
        
        const controls = new OrbitControls(camera, renderer.domElement);

        // Disable damping for immediate, responsive control
        controls.enableDamping = false;
        controls.dampingFactor = 0.05; // This won't be used since damping is disabled

        controls.minDistance = 2;
        controls.maxDistance = 10;
        controls.autoRotate = true;
        controls.autoRotateSpeed = 1;

        // Make controls more responsive
        controls.rotateSpeed = 1.0;
        controls.zoomSpeed = 1.2;
        controls.panSpeed = 0.8;

        // Add event listeners to track user interaction
        controls.addEventListener("start", () => {
          isUserInteractingRef.current = true;
        });

        controls.addEventListener("end", () => {
          isUserInteractingRef.current = false;
        });

        controlsRef.current = controls;
        console.log("OrbitControls loaded successfully");
      } catch (error) {
        console.error("Failed to load OrbitControls:", error);
      }
    };

    // Create the moon immediately using procedural generation
    const moonCreated = createProceduralMoon();
    if (!moonCreated) {
      console.error("Failed to create any moon, creating basic fallback");
      // Ultimate fallback - simple sphere
      const fallbackGeometry = new THREE.SphereGeometry(1, 32, 16);
      const fallbackMaterial = new THREE.MeshStandardMaterial({
        color: 0xaaaaaa,
        roughness: 0.8,
        metalness: 0.0,
      });
      const fallbackMesh = new THREE.Mesh(fallbackGeometry, fallbackMaterial);
      const fallbackGroup = new THREE.Group();
      fallbackGroup.add(fallbackMesh);
      scene.add(fallbackGroup);
      moonRef.current = fallbackGroup;
      console.log("Basic fallback moon created");
    }

    loadControls();

    // Animation loop
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);

      // Subtle rotation for star movement
      if (starFieldRef.current?.stars) {
        starFieldRef.current.stars.rotation.y += 0.0001;
        if (starFieldRef.current.brightStars) {
          starFieldRef.current.brightStars.rotation.y += 0.00005;
          starFieldRef.current.brightStars.rotation.x += 0.00003;
        }
      }

      if (controlsRef.current) {
        // Only auto-rotate when user is not interacting
        if (!isUserInteractingRef.current) {
          controlsRef.current.autoRotate = true;
        } else {
          controlsRef.current.autoRotate = false;
        }

        // Since damping is disabled, we don't need to call update() every frame
        // Only call update when needed for auto-rotation
        if (controlsRef.current.autoRotate) {
          controlsRef.current.update();
        }
      }

      renderer.render(scene, camera);
    };
    animate();

    // Handle resize
    const handleResize = () => {
      if (camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      // Close share menu and search results when clicking outside
      const handleClickOutside = () => {
        setShowShareMenu(false);
        setShowSearchResults(false);
      };
      document.addEventListener("click", handleClickOutside);

      window.removeEventListener("resize", handleResize);
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      if (controlsRef.current) {
        controlsRef.current.dispose();
      }
      if (renderer && container) {
        container.removeChild(renderer.domElement);
        renderer.dispose();
      }

      document.removeEventListener("click", handleClickOutside);
    };
  }, [showSearchResults, showShareMenu, createProceduralMoon]);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black select-none">
      <div
        ref={containerRef}
        className="absolute inset-0"
        onContextMenu={handleContextMenu}
        onClick={() => {
          if (showSearchResults) setShowSearchResults(false);
          if (showShareMenu) setShowShareMenu(false);
        }}
        style={{ cursor: "grab" }}
      />

      {/* Professional Google Earth Minimap */}
      <div className="absolute bottom-20 left-4 w-48 h-36 z-20">
        {/* Minimap Container */}
        <div
          onClick={handleMinimapClick}
          className="w-full h-full bg-white rounded-lg shadow-xl border border-gray-300 cursor-pointer hover:shadow-2xl transition-shadow relative overflow-hidden"
          title="Click to navigate view"
        >
          {/* Map View Area - Full height now without header */}
          <div className="absolute inset-0 bg-black">
            {/* Space Background with Stars */}
            <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900">
              {/* Fixed star positions to prevent hydration mismatch */}
              {isClient &&
                getFixedStarPositions().map((pos, i) => (
                  <div
                    key={i}
                    className="absolute w-0.5 h-0.5 bg-white rounded-full opacity-60"
                    style={{
                      left: pos.left,
                      top: pos.top,
                    }}
                  ></div>
                ))}
            </div>

            {/* Moon Representation */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-20 h-20">
              {/* Moon Base */}
              <div className="w-full h-full bg-gradient-to-br from-gray-200 via-gray-300 to-gray-400 rounded-full relative shadow-inner border border-gray-400">
                {/* Realistic Lunar Features */}

                {/* Mare Tranquillitatis (Sea of Tranquility) */}
                <div className="absolute top-3 left-4 w-6 h-4 bg-gray-600 rounded-full opacity-80"></div>

                {/* Mare Imbrium (Sea of Rains) */}
                <div className="absolute top-1 left-2 w-4 h-5 bg-gray-650 rounded-full opacity-70"></div>

                {/* Tycho Crater */}
                <div className="absolute bottom-3 left-6 w-3 h-3 bg-gray-700 rounded-full border border-gray-500 shadow-inner"></div>

                {/* Copernicus Crater */}
                <div className="absolute top-4 right-3 w-2.5 h-2.5 bg-gray-600 rounded-full border border-gray-500"></div>

                {/* Small craters */}
                <div className="absolute top-6 left-7 w-1.5 h-1.5 bg-gray-600 rounded-full opacity-60"></div>
                <div className="absolute bottom-2 right-4 w-1 h-1 bg-gray-600 rounded-full opacity-50"></div>
                <div className="absolute top-2 right-6 w-1 h-1 bg-gray-600 rounded-full opacity-40"></div>
                <div className="absolute bottom-5 left-3 w-1 h-1 bg-gray-600 rounded-full opacity-45"></div>

                {/* Current View Indicator */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <div className="w-6 h-6 border-2 border-blue-400 rounded-full bg-blue-400/10 animate-pulse"></div>
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-blue-400 rounded-full"></div>
                </div>

                {/* Terminator Line (Day/Night Border) */}
                <div className="absolute top-0 right-4 bottom-0 w-px bg-gradient-to-b from-transparent via-gray-500 to-transparent opacity-30"></div>
              </div>
            </div>

            {/* Coordinate Grid Overlay */}
            <div className="absolute inset-0 opacity-20">
              <svg className="w-full h-full">
                <defs>
                  <pattern
                    id="miniGrid"
                    width="12"
                    height="12"
                    patternUnits="userSpaceOnUse"
                  >
                    <path
                      d="M 12 0 L 0 0 0 12"
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="0.3"
                    />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#miniGrid)" />
              </svg>
            </div>

            {/* Crosshairs */}
            <div className="absolute top-1/2 left-0 right-0 h-px bg-blue-400/40"></div>
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-blue-400/40"></div>
          </div>

          {/* Footer Info */}
          <div className="absolute bottom-0 left-0 right-0 h-6 bg-gray-50 border-t border-gray-200 flex items-center justify-between px-2 text-xs text-gray-600">
            <span>3,474 km</span>
            <span>
              Z:{" "}
              {cameraRef.current
                ? Math.round(10 - cameraRef.current.position.length())
                : 3}
            </span>
          </div>

          {/* Compass */}
          <div className="absolute top-2 right-2 w-6 h-6 bg-white rounded-full shadow-md border border-gray-300 flex items-center justify-center">
            <svg
              className="w-3 h-3 text-red-500"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2l3.09 6.26L22 9l-6.91 1.74L12 22l-3.09-6.26L2 15l6.91-1.74L12 2z" />
            </svg>
          </div>

          {/* Click Interaction Hint */}
          <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
            Click to navigate
          </div>
        </div>
      </div>

      {/* Right side controls - horizontal alignment at bottom right */}
      <div className="absolute right-4 bottom-32 flex gap-2 z-20">
        <button
          onClick={() => {
            // Toggle star visibility
            if (starFieldRef.current?.stars) {
              starFieldRef.current.stars.visible =
                !starFieldRef.current.stars.visible;
              if (starFieldRef.current.brightStars) {
                starFieldRef.current.brightStars.visible =
                  !starFieldRef.current.brightStars.visible;
              }
            }
          }}
          className="w-12 h-12 bg-gray-600/80 hover:bg-gray-500/80 rounded-full border border-gray-500 flex items-center justify-center text-white transition-colors shadow-lg cursor-pointer"
          title="Toggle Layers"
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17,7H22V17H17V19A1,1 0 0,0 18,20H20V22H17.5C16.95,22 16,21.55 16,21C16,21.55 15.05,22 14.5,22H12V20H14A1,1 0 0,0 15,19V5A1,1 0 0,0 14,4H12V2H14.5C15.05,2 16,2.45 16,3C16,2.45 16.95,2 17.5,2H20V4H18A1,1 0 0,0 17,5V7M2,7H13V9H4V15H13V17H2V7M20,9H19V15H20V9M16,9H15V15H16V9Z" />
          </svg>
        </button>
        <button
          onClick={() => {
            // Center moon in view
            if (moonRef.current && cameraRef.current && controlsRef.current) {
              controlsRef.current.target.set(0, 0, 0);
              controlsRef.current.update();
            }
          }}
          className="w-12 h-12 bg-gray-600/80 hover:bg-gray-500/80 rounded-full border border-gray-500 flex items-center justify-center text-white transition-colors shadow-lg cursor-pointer"
          title="Center View"
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z" />
          </svg>
        </button>
      </div>

      {/* Zoom controls - moved up to make room */}
      <div className="absolute right-4 bottom-48 flex flex-col gap-1 z-20">
        <button
          onClick={() => {
            if (cameraRef.current && controlsRef.current) {
              const camera = cameraRef.current;
              const newDistance = Math.max(camera.position.length() - 0.5, 2);
              const direction = camera.position.clone().normalize();
              camera.position.copy(direction.multiplyScalar(newDistance));
            }
          }}
          className="w-10 h-10 bg-gray-600/80 hover:bg-gray-500/80 rounded-t-lg border border-gray-500 flex items-center justify-center text-white transition-colors text-xl font-bold shadow-lg cursor-pointer"
        >
          +
        </button>
        <button
          onClick={() => {
            if (cameraRef.current && controlsRef.current) {
              const camera = cameraRef.current;
              const newDistance = Math.min(camera.position.length() + 0.5, 10);
              const direction = camera.position.clone().normalize();
              camera.position.copy(direction.multiplyScalar(newDistance));
            }
          }}
          className="w-10 h-10 bg-gray-600/80 hover:bg-gray-500/80 rounded-b-lg border border-gray-500 border-t-0 flex items-center justify-center text-white transition-colors text-xl font-bold shadow-lg cursor-pointer"
        >
          −
        </button>
      </div>

      {/* Context Menu */}
      {showContextMenu && (
        <div
          className="absolute z-50 bg-gray-900 text-white rounded-lg shadow-2xl py-2 min-w-[220px] border border-gray-700"
          style={{
            left: contextMenuPosition.x,
            top: contextMenuPosition.y,
          }}
          onClick={(e) => e.stopPropagation()}
          onMouseLeave={() => setShowContextMenu(false)}
        >
          <div className="px-4 py-2 text-sm font-medium border-b border-gray-700">
            Moon Controls
          </div>
          <button
            onClick={handleFullscreen}
            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-800"
          >
            Fullscreen View
          </button>
          <button
            onClick={() => {
              navigator.clipboard.writeText(
                "0x742d35Cc6634C0532925a3b8D63C4e64c6A6E6E2"
              );
              alert("Contract address copied!");
              setShowContextMenu(false);
            }}
            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-800"
          >
            Copy Contract Address
          </button>
        </div>
      )}

      {/* Top Navigation - RESTORED */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-30 pointer-events-auto">
        <div className="flex items-center gap-2 sm:gap-4">
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
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="Search lunar features..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch(e)}
                className="bg-transparent text-gray-900 placeholder-gray-500 px-4 py-3 w-48 md:w-64 lg:w-80 focus:outline-none cursor-text"
              />
              <button
                onClick={() =>
                  handleSearch({
                    preventDefault: () => {},
                    key: "Enter",
                  } as React.KeyboardEvent)
                }
                className="mr-3 p-1.5 bg-blue-500 hover:bg-blue-600 rounded-md transition-colors cursor-pointer"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                  <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71L12 2z" />
                </svg>
              </button>
            </div>

            {/* Search Results Dropdown - Higher z-index */}
            {showSearchResults && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 max-h-60 overflow-y-auto z-50">
                <div className="flex items-center justify-between p-3 border-b border-gray-200">
                  <span className="text-sm font-medium text-gray-700">
                    Search Results
                  </span>
                  <button
                    onClick={() => setShowSearchResults(false)}
                    className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    <svg
                      className="w-4 h-4 text-gray-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
                {searchResults.map((result, index) => (
                  <button
                    key={index}
                    onClick={() => handleSearchResultClick(result)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-100 border-b border-gray-100 last:border-b-0 text-gray-800 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <svg
                        className="w-4 h-4 text-gray-500"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12,6.5A2.5,2.5 0 0,1 14.5,9A2.5,2.5 0 0,1 12,11.5A2.5,2.5 0 0,1 9.5,9A2.5,2.5 0 0,1 12,6.5M12,2A7,7 0 0,1 19,9C19,14.25 12,22 12,22C12,22 5,14.25 5,9A7,7 0 0,1 12,2M12,4A5,5 0 0,0 7,9C7,10 7,12 12,18.71C17,12 17,10 17,9A5,5 0 0,0 12,4Z" />
                      </svg>
                      {result}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setShowShareMenu(!showShareMenu)}
            className="relative flex items-center gap-2 bg-gray-700/80 hover:bg-gray-600/80 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-full transition-all duration-200 backdrop-blur-sm border border-gray-600 shadow-lg cursor-pointer"
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

          {/* Enhanced Share Menu */}
          {showShareMenu && (
            <div className="absolute top-16 right-0 bg-gray-900/95 backdrop-blur-md rounded-lg shadow-2xl border border-gray-700 min-w-[280px] z-50 animate-in slide-in-from-top-2 duration-200">
              <div className="p-4">
                <div className="text-white font-medium mb-3 flex items-center gap-2">
                  <svg
                    className="w-5 h-5 text-blue-400"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z" />
                  </svg>
                  Share Moon View
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      alert("Link copied to clipboard!");
                      setShowShareMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-left text-gray-300 hover:text-white hover:bg-gray-800 rounded transition-colors"
                  >
                    <svg
                      className="w-5 h-5 text-blue-400"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
                    </svg>
                    <span>Copy Link</span>
                  </button>

                  <button
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({
                          title: "Google Earth Moon",
                          text: "Experience the Moon in stunning detail with Google Earth!",
                          url: window.location.href,
                        });
                      } else {
                        alert("Native sharing not supported on this device");
                      }
                      setShowShareMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-left text-gray-300 hover:text-white hover:bg-gray-800 rounded transition-colors"
                  >
                    <svg
                      className="w-5 h-5 text-green-400"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M21 6h-2l-1.27-1.27A2.49 2.49 0 0 0 16 4h-2.5A2.49 2.49 0 0 0 11.73 4.73L10.46 6H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zM7 17c-1.38 0-2.5-1.12-2.5-2.5S5.62 12 7 12s2.5 1.12 2.5 2.5S8.38 17 7 17zm5-6.5c-2.48 0-4.5 2.02-4.5 4.5s2.02 4.5 4.5 4.5 4.5-2.02 4.5-4.5-2.02-4.5-4.5-4.5z" />
                    </svg>
                    <span>Share via Device</span>
                  </button>

                  <button
                    onClick={() => {
                      const twitterText = encodeURIComponent(
                        "Check out this amazing 3D Moon model on Google Earth! 🌙"
                      );
                      const twitterUrl = `https://twitter.com/intent/tweet?text=${twitterText}&url=${encodeURIComponent(
                        window.location.href
                      )}`;
                      window.open(twitterUrl, "_blank");
                      setShowShareMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-left text-gray-300 hover:text-white hover:bg-gray-800 rounded transition-colors"
                  >
                    <svg
                      className="w-5 h-5 text-blue-400"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                    </svg>
                    <span>Share on Twitter</span>
                  </button>

                  <div className="pt-2 border-t border-gray-700">
                    <div className="text-xs text-gray-500 mb-2">
                      Quick Actions
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(
                          "742d35Cc6634C0532925a3b8D63C4e64c6A6E6E2"
                        );
                        alert("Contract address copied!");
                        setShowShareMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-left text-gray-300 hover:text-white hover:bg-gray-800 rounded transition-colors"
                    >
                      <svg
                        className="w-5 h-5 text-yellow-400"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
                      </svg>
                      <span>Copy Contract Address</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Info Overlay - Changed from NASA to Google branding */}
      <div className="absolute top-20 left-4 z-20 pointer-events-none">
        <div className="bg-gray-900/95 text-white px-4 py-3 rounded-lg backdrop-blur-sm border border-gray-700">
          <div className="text-base sm:text-lg font-bold text-blue-400">
            Google Earth - Moon
          </div>
          <div className="text-xs sm:text-sm text-gray-300 space-y-1">
            <div>Satellite Imagery</div>
            <div>High-Resolution Lunar Surface</div>
          </div>
        </div>
      </div>

      {/* Bottom status bar - Google Earth style */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gray-900/95 border-t border-gray-700 flex items-center justify-between px-4 z-20">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2L13.09 8.26L20 9L13.09 15.74L12 22L10.91 15.74L4 9L10.91 8.26L12 2Z"
                fill="#4F85F4"
              />
            </svg>
            <span className="text-white font-medium">Google</span>
          </div>
          <div className="text-gray-300 text-sm">100%</div>
          <button
            onClick={() =>
              alert(
                "Imagery ©2024 NASA/JPL-Caltech, Data providers: NASA, USGS"
              )
            }
            className="text-gray-300 hover:text-white text-sm underline cursor-pointer"
          >
            Data attribution
          </button>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-gray-300 text-sm">3,474 km</div>
          <div className="text-gray-300 text-sm">Camera: 384,400 km</div>
          <div className="text-gray-300 text-sm">
            0°00&apos;00&quot;N 0°00&apos;00&quot;E
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoogleMaps;