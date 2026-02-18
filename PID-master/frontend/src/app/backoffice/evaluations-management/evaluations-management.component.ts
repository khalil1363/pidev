import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { EvaluationApiService, Evaluation } from '../../core/services/evaluation-api.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-evaluations-management',
  templateUrl: './evaluations-management.component.html',
  styleUrls: ['./evaluations-management.component.css']
})
export class EvaluationsManagementComponent implements OnInit {
  evaluations: Evaluation[] = [];
  loading = true;

  constructor(
    private api: EvaluationApiService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.api.getEvaluations().subscribe({
      next: (list) => {
        this.evaluations = list;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Failed to load evaluations', 'Close', { duration: 3000 });
      }
    });
  }

  addNew(): void {
    this.router.navigate(['/backoffice/evaluations/new']);
  }

  edit(id: number): void {
    this.router.navigate(['/backoffice/evaluations', id]);
  }

  manageQuestions(id: number): void {
    this.router.navigate(['/backoffice/evaluations', id, 'questions']);
  }

  viewAttempts(id: number): void {
    this.router.navigate(['/backoffice/evaluations', id, 'attempts']);
  }

  delete(e: Evaluation): void {
    if (!e.id || !confirm('Delete this evaluation?')) return;
    this.api.deleteEvaluation(e.id).subscribe({
      next: () => {
        this.snackBar.open('Evaluation deleted', 'Close', { duration: 2000 });
        this.load();
      },
      error: () => this.snackBar.open('Delete failed', 'Close', { duration: 3000 })
    });
  }

  formatDate(s: string | undefined): string {
    if (!s) return '-';
    return new Date(s).toLocaleDateString();
  }
}
