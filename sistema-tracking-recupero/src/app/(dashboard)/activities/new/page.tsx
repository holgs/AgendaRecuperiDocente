'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Save, Calculator, Clock } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Teacher {
  id: string;
  nome: string;
  cognome: string;
}

interface RecoveryType {
  id: string;
  name: string;
  description: string;
  color: string;
  defaultDuration: number;
}

interface SchoolYear {
  id: string;
  name: string;
  isActive: boolean;
}

export default function NewActivityPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    teacherId: '',
    recoveryTypeId: '',
    schoolYearId: '',
    date: '',
    durationMinutes: '',
  });

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [recoveryTypes, setRecoveryTypes] = useState<RecoveryType[]>([]);
  const [schoolYears, setSchoolYears] = useState<SchoolYear[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [modulesEquivalent, setModulesEquivalent] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // Calculate modules equivalent when duration changes
    const duration = parseInt(formData.durationMinutes) || 0;
    const modules = Math.floor(duration / 50); // 50 minutes per module
    setModulesEquivalent(modules);
  }, [formData.durationMinutes]);

  const fetchData = async () => {
    try {
      const [teachersRes, recoveryTypesRes, schoolYearsRes] = await Promise.all([
        fetch('/api/teachers'),
        fetch('/api/recovery-types'),
        fetch('/api/school-years'),
      ]);

      if (teachersRes.ok) {
        const teachersData = await teachersRes.json();
        setTeachers(teachersData.teachers || []);
      }

      if (recoveryTypesRes.ok) {
        const recoveryTypesData = await recoveryTypesRes.json();
        setRecoveryTypes(recoveryTypesData.recoveryTypes || []);
      }

      if (schoolYearsRes.ok) {
        const schoolYearsData = await schoolYearsRes.json();
        const years = schoolYearsData.data || [];
        setSchoolYears(years);

        // Auto-select active school year
        const activeYear = years.find((year: SchoolYear) => year.isActive);
        if (activeYear) {
          setFormData(prev => ({ ...prev, schoolYearId: activeYear.id }));
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setErrors(['Errore nel caricamento dei dati']);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Auto-fill duration when recovery type changes
    if (field === 'recoveryTypeId') {
      const selectedType = recoveryTypes.find(type => type.id === value);
      if (selectedType && selectedType.defaultDuration) {
        setFormData(prev => ({ ...prev, durationMinutes: selectedType.defaultDuration.toString() }));
      }
    }
  };

  const validateForm = () => {
    const newErrors = [];

    if (!formData.title.trim()) {
      newErrors.push('Il titolo è obbligatorio');
    }
    if (!formData.teacherId) {
      newErrors.push('Seleziona un docente');
    }
    if (!formData.recoveryTypeId) {
      newErrors.push('Seleziona una tipologia di recupero');
    }
    if (!formData.schoolYearId) {
      newErrors.push('Seleziona un anno scolastico');
    }
    if (!formData.date) {
      newErrors.push('La data è obbligatoria');
    }
    if (!formData.durationMinutes || parseInt(formData.durationMinutes) <= 0) {
      newErrors.push('La durata deve essere maggiore di 0 minuti');
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/activities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          durationMinutes: parseInt(formData.durationMinutes),
          modulesEquivalent,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        router.push('/activities');
      } else {
        setErrors([result.error || 'Errore durante la registrazione dell\'attività']);
      }
    } catch (error) {
      console.error('Error creating activity:', error);
      setErrors(['Errore di connessione durante la registrazione']);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins > 0 ? `${mins}m` : ''}`;
    }
    return `${mins}m`;
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/activities">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Indietro
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Registra Nuova Attività</h1>
          <p className="text-muted-foreground">
            Registra una nuova attività di recupero nel sistema
          </p>
        </div>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1">
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Informazioni Generali</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Titolo Attività *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="es. Recupero Matematica - Algebra"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Descrizione</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Descrizione dettagliata dell'attività svolta..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="teacherId">Docente *</Label>
                <Select value={formData.teacherId} onValueChange={(value) => handleInputChange('teacherId', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona docente" />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers.map((teacher) => (
                      <SelectItem key={teacher.id} value={teacher.id}>
                        {teacher.cognome} {teacher.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="schoolYearId">Anno Scolastico *</Label>
                <Select value={formData.schoolYearId} onValueChange={(value) => handleInputChange('schoolYearId', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona anno" />
                  </SelectTrigger>
                  <SelectContent>
                    {schoolYears.map((year) => (
                      <SelectItem key={year.id} value={year.id}>
                        {year.name} {year.isActive && '(Attivo)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Activity Details */}
        <Card>
          <CardHeader>
            <CardTitle>Dettagli Attività</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="recoveryTypeId">Tipologia Recupero *</Label>
                <Select value={formData.recoveryTypeId} onValueChange={(value) => handleInputChange('recoveryTypeId', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona tipologia" />
                  </SelectTrigger>
                  <SelectContent>
                    {recoveryTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="date">Data Attività *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="durationMinutes">Durata (minuti) *</Label>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="durationMinutes"
                  type="number"
                  min="1"
                  value={formData.durationMinutes}
                  onChange={(e) => handleInputChange('durationMinutes', e.target.value)}
                  placeholder="120"
                  className="flex-1"
                  required
                />
                {formData.durationMinutes && (
                  <span className="text-sm text-muted-foreground">
                    = {formatTime(parseInt(formData.durationMinutes))}
                  </span>
                )}
              </div>
            </div>

            {/* Modules Calculation */}
            {modulesEquivalent > 0 && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">
                    Moduli equivalenti: {modulesEquivalent}
                  </span>
                </div>
                <p className="text-xs text-blue-600 mt-1">
                  Calcolato automaticamente: {formatTime(parseInt(formData.durationMinutes))} ÷ 50 min = {modulesEquivalent} moduli
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-4">
          <Link href="/activities" className="flex-1">
            <Button type="button" variant="outline" className="w-full">
              Annulla
            </Button>
          </Link>
          <Button type="submit" disabled={isLoading} className="flex-1">
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Registrazione...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Registra Attività
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
