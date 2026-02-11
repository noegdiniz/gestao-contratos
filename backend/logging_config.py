import os
import sys
import logging
from loguru import logger
from models import SessionLocal, Log
import datetime
from concurrent.futures import ThreadPoolExecutor

# Thread pool for asynchronous database logging
executor = ThreadPoolExecutor(max_workers=3)

class DatabaseSink:
    def write(self, message):
        record = message.record
        
        # Extract metadata from extra or use defaults
        menu = record["extra"].get("menu", "SYSTEM")
        user_name = record["extra"].get("user_name", "N/A")
        user_perfil = record["extra"].get("user_perfil", "N/A")
        action = record["extra"].get("action", record["function"])
        
        # Prepare the log entry
        log_entry = {
            "level": record["level"].name,
            "menu": menu,
            "userName": user_name,
            "userPerfil": user_perfil,
            "action": action,
            "info": record["message"],
            "traceback": record["exception"].traceback if record["exception"] else None
        }
        
        # Dispatch to thread pool to avoid blocking the main thread
        executor.submit(self._save_to_db, log_entry)

    def _save_to_db(self, log_entry):
        try:
            db = SessionLocal()
            try:
                new_log = Log(**log_entry)
                db.add(new_log)
                db.commit()
            except Exception as e:
                # Fallback to stderr if DB logging fails to avoid silent failures
                sys.stderr.write(f"CRITICAL: Failed to save log to database: {e}\n")
            finally:
                db.close()
        except Exception as e:
            sys.stderr.write(f"CRITICAL: Database connection error in logging sink: {e}\n")

def setup_logging():
    # Remove default handler
    logger.remove()

    # 1. Console Sink (Pretty printed)
    logger.add(
        sys.stdout, 
        format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
        level="INFO",
        colorize=True
    )

    # 2. File Sink (JSON)
    log_dir = os.path.join(os.getcwd(), "logs")
    if not os.path.exists(log_dir):
        os.makedirs(log_dir)
        
    logger.add(
        os.path.join(log_dir, "app.log"),
        format="{time:YYYY-MM-DD HH:mm:ss} | {level} | {name}:{function}:{line} | {message} | {extra}",
        level="DEBUG",
        rotation="10 MB",
        retention="7 days",
        serialize=True # Save as JSON for easier parsing later
    )

    # 3. Database Sink
    logger.add(DatabaseSink(), level="INFO")

    # Intercept standard logging
    class InterceptHandler(logging.Handler):
        def emit(self, record):
            try:
                level = logger.level(record.levelname).name
            except ValueError:
                level = record.levelno

            frame, depth = logging.currentframe(), 2
            while frame.f_code.co_filename == logging.__file__:
                frame = frame.f_back
                depth += 1

            logger.opt(depth=depth, exception=record.exc_info).log(level, record.getMessage())

    logging.basicConfig(handlers=[InterceptHandler()], level=0, force=True)
    
    # Silence noisy loggers
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)

    return logger
