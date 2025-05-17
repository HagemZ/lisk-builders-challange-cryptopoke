'use client';
import { useEffect, useRef, useState } from 'react';
import { Toaster, toast } from 'sonner';
import { CryptoPokeSkeleton } from '../Loader'; // Adjust import path if needed
import { useRouter } from 'next/navigation'; // For redirection
import { BackgroundGradient } from '../ui/background-gradient';
import Background from '../Background';

interface AnimalCaptureGameProps {
  onCaptureComplete?: () => void;
  moonster?: { id: number; chance: number; name: string };
}

const AnimalCaptureGame: React.FC<AnimalCaptureGameProps> = ({ onCaptureComplete, moonster }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true); // Track initial loading state
  const [timeLeft, setTimeLeft] = useState(300); // 30-second time limit
  const [captures, setCaptures] = useState(0); // Track number of captures
  const [gameEnded, setGameEnded] = useState(false); // Track if game has ended
  const router = useRouter();

  // Use refs for game loop state to avoid re-renders
  const gameState = useRef({
    animationFrame: 0,
    walkFrameIndex: 0,
    idleFrameIndex: 0,
    monsterFrameIndex: 0,
    idleMonsterFrameIndex: 0,
    monsterMoveTimer: 0,
    isMonsterMoving: true,
  });

  // Character and monster properties
  const character = useRef({
    x: 320, // Center of 640x640 canvas
    y: 320,
    size: 64,
    speed: 5,
    direction: 'down',
    isMoving: false,
  });

  const animal = useRef({
    x: 0,
    y: 0,
    size: 64,
    speed: 1,
    direction: '',
    isMoving: true, // For animation purposes
  });

  // Define images ref at component level
  const images = useRef({
    walkSprite: new Image(),
    idleSprite: new Image(),
    backgroundImage: new Image(),
    monsterSprite: new Image(),
    idleMonsterSprite: new Image(),
  });

  // Define collisionMap at component level
  const collisionMap = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  ];

  // Define utility functions at component level
  const getRandomDirection = () => {
    const directions = ['up', 'down', 'left', 'right'];
    return directions[Math.floor(Math.random() * directions.length)];
  };

  const isColliding = (x: number, y: number) => {
    const tileX = Math.floor(x / 32); // Assuming TILE_SIZE is 32
    const tileY = Math.floor(y / 32);
    return collisionMap[tileY]?.[tileX] === 1;
  };

  const getRandomPassablePosition = () => {
    let newX, newY;
    do {
      const randomTileX = Math.floor(Math.random() * collisionMap[0].length);
      const randomTileY = Math.floor(Math.random() * collisionMap.length);
      if (collisionMap[randomTileY][randomTileX] === 0) {
        newX = randomTileX * 32 + 16; // Center of tile (TILE_SIZE / 2)
        newY = randomTileY * 32 + 16;
        break;
      }
    } while (true);
    return { x: newX, y: newY };
  };

  // Load assets in the first useEffect
  useEffect(() => {
    console.log('useEffect started'); // Debug: Confirm useEffect runs
    
    const canvas = canvasRef.current;
    if (!canvas) {
      console.error('Canvas ref is null');
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('2D context is null');
      return;
    }

    // Canvas dimensions (match the world size: 20 tiles * 32 pixels)
    canvas.width = 640;
    canvas.height = 640;

    let loadedImages = 0;
    const totalImages = 5; // Number of images to load

    const checkLoaded = (imageName: string) => {
      loadedImages++;
      console.log(`Image ${imageName} loaded. Total loaded: ${loadedImages}/${totalImages}`);
      if (loadedImages === totalImages) {
        console.log('All images loaded, setting isLoading to false');
        setIsLoading(false); // All images loaded, hide skeleton
      }
    };

    const handleImageError = (imageName: string) => {
      console.error(`Failed to load image: ${imageName}`);
      loadedImages++; // Increment even on error to avoid stalling
      if (loadedImages === totalImages) {
        console.log('All images processed (some with errors), setting isLoading to false');
        setIsLoading(false);
      }
    };

    // Assign onload and onerror handlers with debug logs
    images.current.walkSprite.onload = () => checkLoaded('walkSprite');
    images.current.walkSprite.onerror = () => handleImageError('walkSprite');
    images.current.walkSprite.src = '/char/walk.png';
    console.log('Loading walkSprite from:', images.current.walkSprite.src);

    images.current.idleSprite.onload = () => checkLoaded('idleSprite');
    images.current.idleSprite.onerror = () => handleImageError('idleSprite');
    images.current.idleSprite.src = '/char/idle.png';
    console.log('Loading idleSprite from:', images.current.idleSprite.src);

    images.current.backgroundImage.onload = () => checkLoaded('backgroundImage');
    images.current.backgroundImage.onerror = () => handleImageError('backgroundImage');
    images.current.backgroundImage.src = '/char/forest.png';
    console.log('Loading backgroundImage from:', images.current.backgroundImage.src);

    images.current.monsterSprite.onload = () => checkLoaded('monsterSprite');
    images.current.monsterSprite.onerror = () => handleImageError('monsterSprite');
    images.current.monsterSprite.src = '/char/monster_walk.png';
    console.log('Loading monsterSprite from:', images.current.monsterSprite.src);

    images.current.idleMonsterSprite.onload = () => checkLoaded('idleMonsterSprite');
    images.current.idleMonsterSprite.onerror = () => handleImageError('idleMonsterSprite');
    images.current.idleMonsterSprite.src = '/char/monster.png';
    console.log('Loading idleMonsterSprite from:', images.current.idleMonsterSprite.src);

    // Initialize monster position and direction
    const initialPosition = getRandomPassablePosition();
    animal.current.x = initialPosition.x;
    animal.current.y = initialPosition.y;
    animal.current.direction = getRandomDirection();

    const handleKeyDown = (e: KeyboardEvent) => {
      let newX = character.current.x;
      let newY = character.current.y;

      if (e.key === 'ArrowUp' || e.key === 'w') {
        newY -= character.current.speed;
        character.current.direction = 'up';
      }
      if (e.key === 'ArrowDown' || e.key === 's') {
        newY += character.current.speed;
        character.current.direction = 'down';
      }
      if (e.key === 'ArrowLeft' || e.key === 'a') {
        newX -= character.current.speed;
        character.current.direction = 'left';
      }
      if (e.key === 'ArrowRight' || e.key === 'd') {
        newX += character.current.speed;
        character.current.direction = 'right';
      }

      newX = Math.max(0, Math.min(newX, canvas.width - character.current.size));
      newY = Math.max(0, Math.min(newY, canvas.height - character.current.size));

      if (!isColliding(newX, newY)) {
        character.current.x = newX;
        character.current.y = newY;
      }

      character.current.isMoving = true;
    };

    const handleKeyUp = () => {
      character.current.isMoving = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Timer and capture logic
  useEffect(() => {
    if (!isLoading && !gameEnded) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            if (captures < 5) {
              setGameEnded(true); // Mark game as ended
              toast.error('Capture process failed! Redirecting in 3 seconds...');
              setTimeout(() => router.push('/moondex'), 3000);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isLoading, captures, gameEnded, router]);

  // Game loop in the second useEffect
  useEffect(() => {
    if (!isLoading && !gameEnded) {
      console.log('Starting game loop');
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const SPRITE_SIZE = 64;
      const MONSTER_SIZE = SPRITE_SIZE;
      const ANIMATION_SPEED = 5;
      const MONSTER_ANIMATION_SPEED = 8;
      const MONSTER_MOVE_DURATION = 60;
      const MONSTER_PAUSE_DURATION = 30;

      const drawBackground = () => {
        ctx.drawImage(
          images.current.backgroundImage,
          0,
          0,
          canvas.width,
          canvas.height
        );
      };

      const drawCharacter = () => {
        const sprite = character.current.isMoving ? images.current.walkSprite : images.current.idleSprite;
        const directionRow = { up: 0, left: 1, down: 2, right: 3 }[character.current.direction] ?? 2;
        const frameIndex = character.current.isMoving ? gameState.current.walkFrameIndex : gameState.current.idleFrameIndex;

        ctx.drawImage(
          sprite,
          frameIndex * SPRITE_SIZE,
          directionRow * SPRITE_SIZE,
          SPRITE_SIZE,
          SPRITE_SIZE,
          character.current.x - SPRITE_SIZE / 2,
          character.current.y - SPRITE_SIZE / 2,
          SPRITE_SIZE,
          SPRITE_SIZE
        );
      };

      const drawAnimal = () => {
        const sprite = gameState.current.isMonsterMoving ? images.current.monsterSprite : images.current.idleMonsterSprite;
        const directionRow = { up: 0, left: 1, down: 2, right: 3 }[animal.current.direction] ?? 2;
        const frameIndex = gameState.current.isMonsterMoving ? gameState.current.monsterFrameIndex : gameState.current.idleMonsterFrameIndex;

        ctx.drawImage(
          sprite,
          frameIndex * MONSTER_SIZE,
          (gameState.current.isMonsterMoving ? directionRow : 0) * MONSTER_SIZE, // Row 0 for idle
          MONSTER_SIZE,
          MONSTER_SIZE,
          animal.current.x - MONSTER_SIZE / 2,
          animal.current.y - MONSTER_SIZE / 2,
          MONSTER_SIZE,
          MONSTER_SIZE
        );
      };

      const checkCapture = () => {
        const dx = character.current.x - animal.current.x;
        const dy = character.current.y - animal.current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < (character.current.size + animal.current.size) / 2 && captures < 5) {
          setCaptures((prev) => {
            const newCaptures = prev + 1;
            toast.success(`${newCaptures}/5 Monster Captured!`);
            if (newCaptures === 5) {
              setGameEnded(true); // Mark game as ended
              toast.success('All monsters captured! You pass the test!');
              if (onCaptureComplete) {
                setTimeout(() => {
                  onCaptureComplete(); // Properly call the function
                }, 3000); // 3-second delay to show the toast
              }
            }
            return newCaptures;
          });
          const newPosition = getRandomPassablePosition();
          animal.current.x = newPosition.x;
          animal.current.y = newPosition.y;
          animal.current.direction = getRandomDirection();
          gameState.current.monsterMoveTimer = 0;
          gameState.current.isMonsterMoving = true;
          gameState.current.idleMonsterFrameIndex = 0; // Reset idle frame on respawn
        }
      };

      const updateMonsterPosition = () => {
        gameState.current.monsterMoveTimer++;
        if (gameState.current.isMonsterMoving) {
          if (gameState.current.monsterMoveTimer >= MONSTER_MOVE_DURATION) {
            gameState.current.isMonsterMoving = false;
            gameState.current.monsterMoveTimer = 0;
          }
        } else {
          if (gameState.current.monsterMoveTimer >= MONSTER_PAUSE_DURATION) {
            gameState.current.isMonsterMoving = true;
            animal.current.direction = getRandomDirection();
            gameState.current.monsterMoveTimer = 0;
          }
        }

        if (!gameState.current.isMonsterMoving) return;

        let newX = animal.current.x;
        let newY = animal.current.y;

        if (animal.current.direction === 'up') {
          newY -= animal.current.speed;
        } else if (animal.current.direction === 'down') {
          newY += animal.current.speed;
        } else if (animal.current.direction === 'left') {
          newX -= animal.current.speed;
        } else if (animal.current.direction === 'right') {
          newX += animal.current.speed;
        }

        newX = Math.max(0, Math.min(newX, canvas.width - animal.current.size));
        newY = Math.max(0, Math.min(newY, canvas.height - character.current.size));

        if (isColliding(newX, newY) || newX === 0 || newX === canvas.width - animal.current.size || newY === 0 || newY === canvas.height - animal.current.size) {
          animal.current.direction = getRandomDirection();
        } else {
          animal.current.x = newX;
          animal.current.y = newY;
        }
      };

      const gameLoop = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        drawBackground();
        drawCharacter();
        drawAnimal();
        checkCapture();
        updateMonsterPosition();

        gameState.current.animationFrame++;
        if (gameState.current.animationFrame % ANIMATION_SPEED === 0 && character.current.isMoving) {
          gameState.current.walkFrameIndex = (gameState.current.walkFrameIndex + 1) % 4;
        }
        if (gameState.current.animationFrame % MONSTER_ANIMATION_SPEED === 0) {
          if (gameState.current.isMonsterMoving) {
            gameState.current.monsterFrameIndex = (gameState.current.monsterFrameIndex + 1) % 4;
          } else {
            gameState.current.idleMonsterFrameIndex = (gameState.current.idleMonsterFrameIndex + 1) % 4;
          }
        }

        requestAnimationFrame(gameLoop);
      };

      gameLoop();
    }
  }, [isLoading, gameEnded]);

  useEffect(() => {
    if (moonster) {
      console.log('Capturing Moonster:', moonster);
    }
  }, [moonster]);

  return (
    <div className="relative w-full mx-auto p-4">
      <BackgroundGradient className="rounded-[22px] p-2 dark:bg-zinc-900 bg-zinc-600 border-0">
        <Background className="absolute inset-0 -z-10 grid grid-cols-3 gap-8 opacity-15" />
       
        <div className="max-w-5xl h-[700px] bg-gray-900 flex flex-col items-center justify-center border relative">
          {(isLoading || gameEnded) && <CryptoPokeSkeleton />}
          {!gameEnded && (
            <div className="text-white text-xl font-bold mb-4">
              Time Left: {timeLeft}s | Captures: {captures}/5
            </div>
          )}
          <canvas
            ref={canvasRef}
            className="border border-white"
            style={{ display: isLoading || gameEnded ? 'none' : 'block' }}
          />
         
        </div>
      </BackgroundGradient>
    </div>
  );
};

export default AnimalCaptureGame;