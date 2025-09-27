'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ExternalLink, Mail, Phone } from 'lucide-react'

export function Footer() {
  const currentYear = new Date().getFullYear()
  const version = '1.0.0' // This could come from package.json or environment
  
  return (
    <footer className="border-t bg-background px-6 py-4">
      <div className="flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0">
        {/* Left section */}
        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
          <span>© {currentYear} Sistema Tracking Recupero Moduli Docenti</span>
          <Badge variant="outline" className="text-xs">
            v{version}
          </Badge>
        </div>
        
        {/* Right section */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
            <span>Supporto:</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
              asChild
            >
              <a href="mailto:supporto@scuola.it" className="flex items-center space-x-1">
                <Mail className="h-3 w-3" />
                <span>Email</span>
              </a>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
              asChild
            >
              <a href="tel:+39123456789" className="flex items-center space-x-1">
                <Phone className="h-3 w-3" />
                <span>Telefono</span>
              </a>
            </Button>
          </div>
          
          <div className="h-4 w-px bg-border" />
          
          <Button
            variant="ghost"
            size="sm"
            className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
            asChild
          >
            <a 
              href="https://docs.sistema-tracking.it" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center space-x-1"
            >
              <span>Documentazione</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </Button>
        </div>
      </div>
    </footer>
  )
}