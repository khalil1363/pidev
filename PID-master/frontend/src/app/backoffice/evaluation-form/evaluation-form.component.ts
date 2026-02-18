import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { EvaluationApiService, Evaluation } from '../../core/services/evaluation-api.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-evaluation-form',
  templateUrl: './evaluation-form.component.html',
  styleUrls: ['./evaluation-form.component.css']
})
export class EvaluationFormComponent implements OnInit {
  form: FormGroup;
  id: number | null = null;
  loading = false;
  saving = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private api: EvaluationApiService,
    private snackBar: MatSnackBar
  ) {
    this.form = this.fb.group({
      title: ['', Validators.required],
      imageUrl: [''],
      dateStart: ['', Validators.required],
      dateEnd: ['', Validators.required],
      durationMinutes: [60, [Validators.required, Validators.min(1)]],
      numberOfAttempts: [2, [Validators.required, Validators.min(1)]],
      totalScore: [100, [Validators.required, Validators.min(0)]]
    });
  }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam && idParam !== 'new') {
      this.id = +idParam;
      this.load();
    }
  }

  load(): void {
    if (!this.id) return;
    this.loading = true;
    this.api.getEvaluation(this.id).subscribe({
      next: (e) => {
        this.form.patchValue({
          title: e.title,
          imageUrl: e.imageUrl || '',
          dateStart: e.dateStart?.slice(0, 16) || '',
          dateEnd: e.dateEnd?.slice(0, 16) || '',
          durationMinutes: e.durationMinutes ?? 60,
          numberOfAttempts: e.numberOfAttempts ?? 2,
          totalScore: e.totalScore ?? 100
        });
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Failed to load evaluation', 'Close', { duration: 3000 });
      }
    });
  }

  save(): void {
    if (this.form.invalid || this.saving) return;
    const v = this.form.value;
    const body: Partial<Evaluation> = {
      title: v.title,
      imageUrl: v.imageUrl || undefined,
      dateStart: v.dateStart,
      dateEnd: v.dateEnd,
      durationMinutes: v.durationMinutes,
      numberOfAttempts: v.numberOfAttempts,
      totalScore: v.totalScore
    };
    this.saving = true;
    if (this.id) {
      this.api.updateEvaluation(this.id, body).subscribe({
        next: () => {
          this.snackBar.open('Evaluation updated', 'Close', { duration: 2000 });
          this.saving = false;
          this.router.navigate(['/backoffice/evaluations']);
        },
        error: () => {
          this.saving = false;
          this.snackBar.open('Update failed', 'Close', { duration: 3000 });
        }
      });
    } else {
      this.api.createEvaluation(body).subscribe({
        next: (created) => {
          this.snackBar.open('Evaluation created', 'Close', { duration: 2000 });
          this.saving = false;
          this.router.navigate(['/backoffice/evaluations', created.id, 'questions']);
        },
        error: () => {
          this.saving = false;
          this.snackBar.open('Create failed', 'Close', { duration: 3000 });
        }
      });
    }
  }

  cancel(): void {
    this.router.navigate(['/backoffice/evaluations']);
  }
}
