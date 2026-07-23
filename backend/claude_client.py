'''Compatibility layer: exposes the same interface as the original claude_client
but uses the Groq-based implementation underneath.
'''
from .groq_client import *
