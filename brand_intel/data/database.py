"""
Database Connection - UCR FIRST
================================

Database connection management with connection pooling.
"""

import os
from typing import Optional, AsyncGenerator
from contextlib import asynccontextmanager

try:
    from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
    from sqlalchemy.orm import declarative_base
    SQLALCHEMY_AVAILABLE = True
except ImportError:
    SQLALCHEMY_AVAILABLE = False

from brand_intel.core.exceptions import DatabaseError


Base = declarative_base() if SQLALCHEMY_AVAILABLE else None


class Database:
    """
    Database connection manager.
    
    Supports PostgreSQL with async operations.
    """
    
    def __init__(self, database_url: Optional[str] = None):
        if not SQLALCHEMY_AVAILABLE:
            raise DatabaseError("SQLAlchemy not installed. Run: pip install sqlalchemy asyncpg")
        
        self.database_url = database_url or os.getenv("DATABASE_URL")
        if not self.database_url:
            raise DatabaseError("DATABASE_URL not configured")
        
        # Convert postgres:// to postgresql+asyncpg://
        if self.database_url.startswith("postgres://"):
            self.database_url = self.database_url.replace("postgres://", "postgresql+asyncpg://", 1)
        elif self.database_url.startswith("postgresql://"):
            self.database_url = self.database_url.replace("postgresql://", "postgresql+asyncpg://", 1)
        
        self.engine = create_async_engine(
            self.database_url,
            echo=os.getenv("DEBUG", "false").lower() == "true",
            pool_size=5,
            max_overflow=10,
            pool_pre_ping=True,
        )
        
        self.async_session = async_sessionmaker(
            self.engine,
            class_=AsyncSession,
            expire_on_commit=False,
        )
    
    @asynccontextmanager
    async def session(self) -> AsyncGenerator[AsyncSession, None]:
        """Get a database session."""
        async with self.async_session() as session:
            try:
                yield session
                await session.commit()
            except Exception as e:
                await session.rollback()
                raise DatabaseError(f"Database operation failed: {str(e)}", operation="session")
    
    async def close(self):
        """Close database connections."""
        await self.engine.dispose()


# Singleton instance
_database: Optional[Database] = None


def get_database() -> Database:
    """Get the database singleton instance."""
    global _database
    if _database is None:
        _database = Database()
    return _database
