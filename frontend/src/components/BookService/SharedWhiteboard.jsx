import React, { useRef, useEffect, useState } from "react";
import { IoChevronForward, IoChevronBack, IoColorPalette, IoTrash, IoPencil } from "react-icons/io5";

const SharedWhiteboard = ({ socketRef, roomId }) => {
  const canvasRef = useRef(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentColor, setCurrentColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(3);
  const [lastPosition, setLastPosition] = useState({ x: 0, y: 0 });
  const [showColorPicker, setShowColorPicker] = useState(false);
  
  const colors = ["#000000", "#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#FF00FF", "#00FFFF", "#FF9900"];

  // Initialize canvas when component mounts
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    
    // Set white background
    context.fillStyle = "#FFFFFF";
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Set default stroke style
    context.strokeStyle = currentColor;
    context.lineWidth = brushSize;
    context.lineCap = "round";
    context.lineJoin = "round";
  }, [currentColor, brushSize]);

  // Set up socket listeners for receiving drawing data
  useEffect(() => {
    if (!socketRef.current || !roomId) {
      console.log("Missing socket or roomId", roomId, socketRef.current);
      return;
    }

    console.log("Setting up whiteboard socket listeners for room:", roomId);

    // Listen for drawing data from other users
    const handleDrawingEvent = (drawingData) => {
      console.log("Received drawing data:", drawingData);
      if (!canvasRef.current) {
        console.error("Canvas not initialized");
        return;
      }
      
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      
      // Set received drawing styles
      context.strokeStyle = drawingData.color;
      context.lineWidth = drawingData.size;
      
      // Draw the line
      context.beginPath();
      context.moveTo(drawingData.startX, drawingData.startY);
      context.lineTo(drawingData.endX, drawingData.endY);
      context.stroke();
    };

    // Listen for canvas clear event
    const handleClearCanvasEvent = () => {
      console.log("Received clear canvas event");
      if (!canvasRef.current) return;
      
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      context.fillStyle = "#FFFFFF";
      context.fillRect(0, 0, canvas.width, canvas.height);
    };

    socketRef.current.on("drawing", handleDrawingEvent);
    socketRef.current.on("clear-canvas", handleClearCanvasEvent);

    // Clean up listeners when component unmounts
    return () => {
      if (socketRef.current) {
        socketRef.current.off("drawing", handleDrawingEvent);
        socketRef.current.off("clear-canvas", handleClearCanvasEvent);
      }
    };
  }, [socketRef, roomId]);

  // Handle mouse down event to start drawing
  const handleMouseDown = (e) => {
    if (!canvasRef.current) return;
    
    setIsDrawing(true);
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setLastPosition({ x, y });
  };

  // Handle mouse move event to continue drawing
  const handleMouseMove = (e) => {
    if (!isDrawing || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Draw the line on the local canvas
    context.beginPath();
    context.moveTo(lastPosition.x, lastPosition.y);
    context.lineTo(x, y);
    context.stroke();
    
    // Send drawing data to other users
    if (socketRef.current && roomId) {
      console.log("Emitting drawing event for room:", roomId);
      socketRef.current.emit("drawing", {
        room: roomId,
        startX: lastPosition.x,
        startY: lastPosition.y,
        endX: x,
        endY: y,
        color: currentColor,
        size: brushSize
      });
    } else {
      console.warn("Cannot emit drawing event: socket or roomId missing");
    }
    
    setLastPosition({ x, y });
  };

  // Handle mouse up event to stop drawing
  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  // Handle mouse leave event to stop drawing when cursor leaves canvas
  const handleMouseLeave = () => {
    setIsDrawing(false);
  };

  // Handle touch events for mobile support
  const handleTouchStart = (e) => {
    if (!canvasRef.current) return;
    
    setIsDrawing(true);
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    setLastPosition({ x, y });
  };

  const handleTouchMove = (e) => {
    if (!isDrawing || !canvasRef.current) return;
    e.preventDefault(); // Prevent scrolling while drawing
    
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    // Draw the line on the local canvas
    context.beginPath();
    context.moveTo(lastPosition.x, lastPosition.y);
    context.lineTo(x, y);
    context.stroke();
    
    // Send drawing data to other users
    if (socketRef.current && roomId) {
      socketRef.current.emit("drawing", {
        room: roomId,
        startX: lastPosition.x,
        startY: lastPosition.y,
        endX: x,
        endY: y,
        color: currentColor,
        size: brushSize
      });
    }
    
    setLastPosition({ x, y });
  };

  const handleTouchEnd = () => {
    setIsDrawing(false);
  };

  // Clear the canvas
  const clearCanvas = () => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    
    context.fillStyle = "#FFFFFF";
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Emit clear canvas event to other users
    if (socketRef.current && roomId) {
      console.log("Emitting clear-canvas event for room:", roomId);
      socketRef.current.emit("clear-canvas", { room: roomId });
    }
  };

  // Change the brush color
  const changeColor = (color) => {
    setCurrentColor(color);
    
    if (canvasRef.current) {
      const context = canvasRef.current.getContext("2d");
      context.strokeStyle = color;
    }
    
    setShowColorPicker(false);
  };

  // Change the brush size
  const changeBrushSize = (e) => {
    const size = parseInt(e.target.value, 10);
    setBrushSize(size);
    
    if (canvasRef.current) {
      const context = canvasRef.current.getContext("2d");
      context.lineWidth = size;
    }
  };

  return (
    <div style={styles.container(isExpanded)}>
      <div 
        style={styles.toggleButton}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? <IoChevronBack size={24} /> : <IoChevronForward size={24} />}
      </div>
      
      {isExpanded && (
        <div style={styles.whiteboardContainer}>
          <div style={styles.toolbar}>
            <button
              style={styles.toolButton}
              onClick={() => setShowColorPicker(!showColorPicker)}
              title="Color Palette"
            >
              <IoColorPalette size={20} color={currentColor} />
            </button>
            
            <button
              style={styles.toolButton}
              onClick={clearCanvas}
              title="Clear Canvas"
            >
              <IoTrash size={20} />
            </button>
            
            <div style={styles.brushSizeContainer}>
              <IoPencil size={16} />
              <input
                type="range"
                min="1"
                max="20"
                value={brushSize}
                onChange={changeBrushSize}
                style={styles.slider}
              />
              <span style={styles.brushSizeValue}>{brushSize}</span>
            </div>
          </div>
          
          {showColorPicker && (
            <div style={styles.colorPicker}>
              {colors.map((color, index) => (
                <div
                  key={index}
                  style={{
                    ...styles.colorOption,
                    backgroundColor: color,
                    border: color === currentColor ? "2px solid #0055A4" : "1px solid #ccc"
                  }}
                  onClick={() => changeColor(color)}
                />
              ))}
            </div>
          )}
          
          <canvas
            ref={canvasRef}
            width={280}
            height={400}
            style={styles.canvas}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          />
        </div>
      )}
    </div>
  );
};

const styles = {
  container: (isExpanded) => ({
    position: "fixed",
    left: 0,
    top: "50%",
    transform: "translateY(-50%)",
    zIndex: 1000,
    backgroundColor: "#2E2E2E",
    borderRadius: "0 8px 8px 0",
    boxShadow: "2px 0 10px rgba(0, 0, 0, 0.3)",
    transition: "width 0.3s ease",
    width: isExpanded ? "300px" : "40px",
    height: isExpanded ? "500px" : "60px",
    display: "flex",
    overflow: "hidden",
  }),
  toggleButton: {
    width: "40px",
    height: "60px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    color: "#FFFFFF",
    backgroundColor: "#0055A4",
    borderRadius: "0 8px 8px 0",
  },
  whiteboardContainer: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    padding: "10px",
  },
  toolbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "5px 0",
    borderBottom: "1px solid #444",
    marginBottom: "10px",
  },
  toolButton: {
    backgroundColor: "transparent",
    border: "none",
    borderRadius: "4px",
    padding: "5px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#FFFFFF",
  },
  brushSizeContainer: {
    display: "flex",
    alignItems: "center",
    color: "#FFFFFF",
  },
  slider: {
    width: "60px",
    margin: "0 5px",
  },
  brushSizeValue: {
    width: "20px",
    textAlign: "center",
    fontSize: "12px",
  },
  colorPicker: {
    display: "flex",
    flexWrap: "wrap",
    gap: "5px",
    padding: "5px 0",
    marginBottom: "10px",
  },
  colorOption: {
    width: "20px",
    height: "20px",
    borderRadius: "50%",
    cursor: "pointer",
  },
  canvas: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: "4px",
    cursor: "crosshair",
    border: "1px solid #444",
  },
};

export default SharedWhiteboard;