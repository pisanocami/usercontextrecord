"""
Formatters - UCR FIRST
=======================

Output formatting utilities for consistent display.
"""

from datetime import datetime, date
from typing import Optional, Union


def format_number(
    value: Union[int, float],
    decimals: int = 0,
    use_commas: bool = True
) -> str:
    """
    Format a number for display.
    
    Args:
        value: Number to format
        decimals: Number of decimal places
        use_commas: Whether to use thousand separators
        
    Returns:
        Formatted string
        
    Examples:
        >>> format_number(1234567)
        "1,234,567"
        >>> format_number(1234.567, decimals=2)
        "1,234.57"
    """
    if value is None:
        return "N/A"
    
    try:
        if decimals > 0:
            formatted = f"{value:,.{decimals}f}" if use_commas else f"{value:.{decimals}f}"
        else:
            formatted = f"{int(value):,}" if use_commas else str(int(value))
        return formatted
    except (ValueError, TypeError):
        return str(value)


def format_percentage(
    value: Union[int, float],
    decimals: int = 1,
    include_sign: bool = True
) -> str:
    """
    Format a percentage for display.
    
    Args:
        value: Percentage value (0-100 or 0-1)
        decimals: Number of decimal places
        include_sign: Whether to include % sign
        
    Returns:
        Formatted percentage string
        
    Examples:
        >>> format_percentage(75.5)
        "75.5%"
        >>> format_percentage(0.755)
        "75.5%"
    """
    if value is None:
        return "N/A"
    
    try:
        # Convert from decimal if needed
        if 0 <= value <= 1 and value != 0 and value != 1:
            value = value * 100
        
        formatted = f"{value:.{decimals}f}"
        
        if include_sign:
            formatted += "%"
        
        return formatted
    except (ValueError, TypeError):
        return str(value)


def format_currency(
    value: Union[int, float],
    currency: str = "USD",
    decimals: int = 0
) -> str:
    """
    Format a currency value for display.
    
    Args:
        value: Currency amount
        currency: Currency code (USD, EUR, etc.)
        decimals: Number of decimal places
        
    Returns:
        Formatted currency string
        
    Examples:
        >>> format_currency(1234567)
        "$1,234,567"
        >>> format_currency(1234.56, decimals=2)
        "$1,234.56"
    """
    if value is None:
        return "N/A"
    
    symbols = {
        "USD": "$",
        "EUR": "€",
        "GBP": "£",
        "JPY": "¥",
        "CNY": "¥",
    }
    
    symbol = symbols.get(currency, currency + " ")
    
    try:
        if decimals > 0:
            formatted = f"{symbol}{value:,.{decimals}f}"
        else:
            formatted = f"{symbol}{int(value):,}"
        return formatted
    except (ValueError, TypeError):
        return str(value)


def format_date(
    value: Union[datetime, date, str],
    format_str: str = "%Y-%m-%d"
) -> str:
    """
    Format a date for display.
    
    Args:
        value: Date value
        format_str: strftime format string
        
    Returns:
        Formatted date string
        
    Examples:
        >>> format_date(datetime(2024, 1, 15))
        "2024-01-15"
        >>> format_date(datetime(2024, 1, 15), "%B %d, %Y")
        "January 15, 2024"
    """
    if value is None:
        return "N/A"
    
    try:
        if isinstance(value, str):
            # Try to parse ISO format
            value = datetime.fromisoformat(value.replace("Z", "+00:00"))
        
        return value.strftime(format_str)
    except (ValueError, AttributeError):
        return str(value)


def format_relative_time(value: datetime) -> str:
    """
    Format a datetime as relative time (e.g., "2 hours ago").
    
    Args:
        value: Datetime value
        
    Returns:
        Relative time string
    """
    if value is None:
        return "N/A"
    
    try:
        now = datetime.utcnow()
        diff = now - value
        
        seconds = diff.total_seconds()
        
        if seconds < 60:
            return "just now"
        elif seconds < 3600:
            minutes = int(seconds / 60)
            return f"{minutes} minute{'s' if minutes != 1 else ''} ago"
        elif seconds < 86400:
            hours = int(seconds / 3600)
            return f"{hours} hour{'s' if hours != 1 else ''} ago"
        elif seconds < 604800:
            days = int(seconds / 86400)
            return f"{days} day{'s' if days != 1 else ''} ago"
        elif seconds < 2592000:
            weeks = int(seconds / 604800)
            return f"{weeks} week{'s' if weeks != 1 else ''} ago"
        else:
            return format_date(value)
    except (ValueError, AttributeError):
        return str(value)


def format_compact_number(value: Union[int, float]) -> str:
    """
    Format a number in compact form (e.g., 1.2K, 3.4M).
    
    Args:
        value: Number to format
        
    Returns:
        Compact formatted string
        
    Examples:
        >>> format_compact_number(1234)
        "1.2K"
        >>> format_compact_number(1234567)
        "1.2M"
    """
    if value is None:
        return "N/A"
    
    try:
        value = float(value)
        
        if value >= 1_000_000_000:
            return f"{value / 1_000_000_000:.1f}B"
        elif value >= 1_000_000:
            return f"{value / 1_000_000:.1f}M"
        elif value >= 1_000:
            return f"{value / 1_000:.1f}K"
        else:
            return str(int(value))
    except (ValueError, TypeError):
        return str(value)
