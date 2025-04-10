import React, { useRef, useEffect } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

const TalkingHead = ({ audioRef }) => {
  const mountRef = useRef(null);
  const mouthRef = useRef(null);
  const animationFrameIdRef = useRef(null);

  useEffect(() => {
    let renderer, scene, camera;

    function init() {
      // Create Scene & Renderer
      scene = new THREE.Scene();
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
      mountRef.current.appendChild(renderer.domElement);

      // Camera setup
      camera = new THREE.PerspectiveCamera(
        45,
        mountRef.current.clientWidth / mountRef.current.clientHeight,
        0.1,
        1000
      );
      camera.position.set(0, 0, 3);
      camera.lookAt(0, 0, 0);

      // Lights
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
      scene.add(ambientLight);
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
      directionalLight.position.set(0, 2, 2);
      scene.add(directionalLight);

      // Load the GLB model
      const loader = new GLTFLoader();
      loader.load(
        "/talking-head.glb", // <-- Update to your actual path
        (gltf) => {
          const model = gltf.scene;
          scene.add(model);

          // Optionally, set a position or scale if needed
          model.position.set(0, 0, 2.2);

          // Find the mouth node by name (must match the name in your 3D file)
          const mouthObject = model.getObjectByName("Mouth");
          if (mouthObject) {
            mouthRef.current = mouthObject;
          } else {
            console.warn("No mesh named 'Mouth  ' found in the model!");
          }

          // Start the animation loop once model is loaded
          animate();
        },
        undefined,
        (error) => {
          console.error("Error loading GLB:", error);
        }
      );
    }

    function animate() {
      // If audio is playing, oscillate the mouth
      if (audioRef?.current && !audioRef.current.paused) {
        const currentTime = audioRef.current.currentTime;
        // Simple sine wave to simulate movement
        const openValue = 0.5 + 0.5 * Math.abs(Math.sin(currentTime * 10));
        if (mouthRef.current) {
          mouthRef.current.scale.y = openValue;
        }
      } else {
        // Default (closed) state when audio is not playing
        if (mouthRef.current) {
          mouthRef.current.scale.y = 1.0;
        }
      }

      renderer.render(scene, camera);
      animationFrameIdRef.current = requestAnimationFrame(animate);
    }

    // Initialize everything
    init();

    // Cleanup on unmount
    return () => {
      cancelAnimationFrame(animationFrameIdRef.current);
      if (renderer) renderer.dispose();
      if (mountRef.current) {
        // Remove the canvas element from the DOM
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, [audioRef]);

  return (
    <div
      ref={mountRef}
      style={{
        width: "100%",
        height: "400px",
        backgroundColor: "#fafafa",
      }}
    />
  );
};

export default TalkingHead;
