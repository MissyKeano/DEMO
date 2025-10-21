```javascript
// Simple Pong game
// Left paddle controlled by mouse and arrow keys. Right paddle is AI.
// Scoreboard tracked and displayed.

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  const playerScoreEl = document.getElementById('playerScore');
  const computerScoreEl = document.getElementById('computerScore');
  const restartBtn = document.getElementById('restartBtn');
  const pauseBtn = document.getElementById('pauseBtn');

  const WIDTH = canvas.width;
  const HEIGHT = canvas.height;

  // Game settings
  const PADDLE_WIDTH = 12;
  const PADDLE_HEIGHT = 100;
  const PADDLE_MARGIN = 12;
  const PADDLE_SPEED = 6; // keyboard speed
  const AI_MAX_SPEED = 4.5;

  const BALL_RADIUS = 8;
  const BALL_START_SPEED = 4;
  const BALL_SPEED_INCREMENT = 0.3;
  const WIN_SCORE = 10;

  let paused = false;

  // paddles
  const leftPaddle = {
    x: PADDLE_MARGIN,
    y: (HEIGHT - PADDLE_HEIGHT) / 2,
    width: PADDLE_WIDTH,
    height: PADDLE_HEIGHT,
    dy: 0
  };

  const rightPaddle = {
    x: WIDTH - PADDLE_WIDTH - PADDLE_MARGIN,
    y: (HEIGHT - PADDLE_HEIGHT) / 2,
    width: PADDLE_WIDTH,
    height: PADDLE_HEIGHT,
    dy: 0
  };

  let playerScore = 0;
  let computerScore = 0;

  // ball
  let ball = createBall();

  // keyboard state
  let upPressed = false;
  let downPressed = false;

  // mouse
  let useMouse = false;

  function createBall(direction = null) {
    const startX = WIDTH / 2;
    const startY = HEIGHT / 2;
    // Random initial angle between -30 and 30 degrees for horizontal direction
    const angleDeg = Math.random() * 60 - 30;
    const angle = (angleDeg * Math.PI) / 180;
    // Choose random horizontal direction if not specified
    const dir = direction !== null ? direction : (Math.random() < 0.5 ? -1 : 1);
    const speed = BALL_START_SPEED;
    return {
      x: startX,
      y: startY,
      r: BALL_RADIUS,
      speed,
      dx: dir * Math.cos(angle) * speed,
      dy: Math.sin(angle) * speed
    };
  }

  // Input handlers
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseY = e.clientY - rect.top;
    // center paddle on mouse
    leftPaddle.y = mouseY - leftPaddle.height / 2;
    clampPaddles();
    useMouse = true;
  });

  canvas.addEventListener('mouseleave', () => {
    useMouse = false;
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') {
      upPressed = true;
      useMouse = false;
    } else if (e.key === 'ArrowDown') {
      downPressed = true;
      useMouse = false;
    } else if (e.key === ' ' || e.key === 'Spacebar') {
      // toggle pause
      paused = !paused;
      pauseBtn.textContent = paused ? 'Resume' : 'Pause';
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowUp') upPressed = false;
    if (e.key === 'ArrowDown') downPressed = false;
  });

  restartBtn.addEventListener('click', () => {
    resetGame();
  });

  pauseBtn.addEventListener('click', () => {
    paused = !paused;
    pauseBtn.textContent = paused ? 'Resume' : 'Pause';
  });

  function clampPaddles() {
    leftPaddle.y = Math.max(0, Math.min(HEIGHT - leftPaddle.height, leftPaddle.y));
    rightPaddle.y = Math.max(0, Math.min(HEIGHT - rightPaddle.height, rightPaddle.y));
  }

  // Main update + draw loop
  let lastTime = performance.now();
  function loop(now) {
    const dt = now - lastTime;
    lastTime = now;
    if (!paused) {
      update(dt / 16.6667); // normalize to ~60fps units
    }
    draw();
    requestAnimationFrame(loop);
  }

  function update(delta) {
    // Move left paddle using keyboard if not using mouse
    if (!useMouse) {
      if (upPressed) {
        leftPaddle.y -= PADDLE_SPEED * delta;
      } else if (downPressed) {
        leftPaddle.y += PADDLE_SPEED * delta;
      }
    }

    clampPaddles();

    // Simple AI for right paddle: follow ball with max speed and slight prediction
    const targetY = ball.y - rightPaddle.height / 2;
    if (Math.abs(targetY - rightPaddle.y) > 1) {
      const direction = targetY > rightPaddle.y ? 1 : -1;
      rightPaddle.y += direction * AI_MAX_SPEED * delta;
      // small error factor when ball is moving away
      if ((ball.dx > 0 && ball.x < WIDTH * 0.6) || (ball.dx < 0 && ball.x > WIDTH * 0.4)) {
        // when ball is far, slower reaction to simulate imperfect AI
        rightPaddle.y += direction * 0.0;
      }
    }
    clampPaddles();

    // Move ball
    ball.x += ball.dx * delta;
    ball.y += ball.dy * delta;

    // wall collisions
    if (ball.y - ball.r <= 0) {
      ball.y = ball.r;
      ball.dy *= -1;
    } else if (ball.y + ball.r >= HEIGHT) {
      ball.y = HEIGHT - ball.r;
      ball.dy *= -1;
    }

    // paddle collisions (left)
    if (ball.x - ball.r <= leftPaddle.x + leftPaddle.width) {
      if (ball.y >= leftPaddle.y && ball.y <= leftPaddle.y + leftPaddle.height) {
        // collision detected
        ball.x = leftPaddle.x + leftPaddle.width + ball.r;
        reflectFromPaddle(leftPaddle);
      }
    }

    // paddle collisions (right)
    if (ball.x + ball.r >= rightPaddle.x) {
      if (ball.y >= rightPaddle.y && ball.y <= rightPaddle.y + rightPaddle.height) {
        ball.x = rightPaddle.x - ball.r;
        reflectFromPaddle(rightPaddle);
      }
    }

    // scoring
    if (ball.x + ball.r < 0) {
      // computer scores
      computerScore++;
      updateScore();
      if (!checkWin()) {
        resetBall(1); // send toward player
      }
    } else if (ball.x - ball.r > WIDTH) {
      // player scores
      playerScore++;
      updateScore();
      if (!checkWin()) {
        resetBall(-1); // send toward computer
      }
    }
  }

  function reflectFromPaddle(paddle) {
    // Increase speed slightly
    ball.speed += BALL_SPEED_INCREMENT;
    // Compute relative hit position (-1 at top, +1 at bottom)
    const relativeIntersectY = (ball.y - (paddle.y + paddle.height / 2)) / (paddle.height / 2);
    // Max bounce angle in radians (approx 60 degrees)
    const maxBounce = (60 * Math.PI) / 180;
    const bounceAngle = relativeIntersectY * maxBounce;

    // Determine direction (to the right if hitting left paddle, and vice versa)
    const direction = paddle === leftPaddle ? 1 : -1;
    ball.dx = direction * Math.cos(bounceAngle) * ball.speed;
    ball.dy = Math.sin(bounceAngle) * ball.speed;
  }

  function resetBall(direction) {
    // direction: 1 -> ball moves right, -1 -> moves left
    ball = createBall(direction);
    // small pause before resuming
    paused = true;
    pauseBtn.textContent = 'Resume';
    setTimeout(() => {
      paused = false;
      pauseBtn.textContent = 'Pause';
    }, 650);
  }

  function updateScore() {
    playerScoreEl.textContent = playerScore;
    computerScoreEl.textContent = computerScore;
  }

  function checkWin() {
    if (playerScore >= WIN_SCORE || computerScore >= WIN_SCORE) {
      paused = true;
      pauseBtn.textContent = 'Resume';
      setTimeout(() => {
        const winner = playerScore > computerScore ? 'You win!' : 'Computer wins!';
        alert(`${winner}\nFinal score: ${playerScore} — ${computerScore}`);
      }, 50);
      return true;
    }
    return false;
  }

  function resetGame() {
    playerScore = 0;
    computerScore = 0;
    updateScore();
    leftPaddle.y = (HEIGHT - leftPaddle.height) / 2;
    rightPaddle.y = (HEIGHT - rightPaddle.height) / 2;
    ball = createBall();
    paused = false;
    pauseBtn.textContent = 'Pause';
  }

  function drawNet() {
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    const segment = 12;
    const gap = 8;
    const x = WIDTH / 2 - 1;
    for (let y = 10; y < HEIGHT; y += segment + gap) {
      ctx.fillRect(x, y, 2, segment);
    }
  }

  function draw() {
    // clear
    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    // background
    ctx.fillStyle = '#03111a';
    roundRect(ctx, 0, 0, WIDTH, HEIGHT, 6, true, false);

    // net
    drawNet();

    // paddles
    ctx.fillStyle = '#1dd4bf';
    roundRect(ctx, leftPaddle.x, leftPaddle.y, leftPaddle.width, leftPaddle.height, 4, true, false);
    roundRect(ctx, rightPaddle.x, rightPaddle.y, rightPaddle.width, rightPaddle.height, 4, true, false);

    // ball
    ctx.fillStyle = '#e6eef6';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.closePath();
  }

  // helper: draw rounded rect
  function roundRect(ctx, x, y, w, h, r, fill, stroke) {
    if (typeof r === 'undefined') r = 5;
    if (typeof fill === 'undefined') fill = true;
    if (typeof stroke === 'undefined') stroke = false;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

  // start
  updateScore();
  lastTime = performance.now();
  requestAnimationFrame(loop);
});