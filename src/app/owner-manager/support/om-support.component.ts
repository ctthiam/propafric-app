import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-om-support',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './om-support.component.html',
  styleUrls: ['./om-support.component.scss'],
})
export class OmSupportComponent {
  faqs = [
    {
      q: 'Comment ajouter un bien immobilier ?',
      a: 'Rendez-vous dans "Mes biens" puis cliquez sur "Ajouter un bien". Renseignez le nom, le type, l\'adresse et les caractéristiques du bien.',
    },
    {
      q: 'Comment créer un bail ?',
      a: 'Dans la section "Baux", cliquez sur "Nouveau bail". Sélectionnez le bien et le locataire, définissez la durée, le loyer et la date de début. Le système génère automatiquement les échéances.',
    },
    {
      q: 'Comment enregistrer un paiement de loyer ?',
      a: 'Allez dans "Paiements" puis "Enregistrer un paiement". Sélectionnez l\'échéance correspondante dans la liste — le montant restant se pré-remplit automatiquement.',
    },
    {
      q: 'Comment voir les loyers en retard ?',
      a: 'Dans "Échéancier", filtrez par statut "En retard" pour voir toutes les échéances impayées dépassant leur date d\'échéance.',
    },
    {
      q: 'Comment modifier mon mot de passe ?',
      a: 'Cliquez sur l\'icône cadenas 🔒 en bas à gauche de la sidebar pour changer votre mot de passe.',
    },
    {
      q: 'Comment upgrader mon plan ?',
      a: 'Contactez PropAfric via WhatsApp ou email pour passer au plan Solo ou Pro et débloquer plus de biens et fonctionnalités.',
    },
  ];

  openedFaq: number | null = null;

  toggleFaq(i: number): void {
    this.openedFaq = this.openedFaq === i ? null : i;
  }
}
