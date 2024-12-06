// Initialisation de l'objet des règles
const rules = {
    phone: [],
    postal: [],
    email: [
      {
        message: "L'email doit être valide.",
        check: (input) => /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/.test(input),
      },
    ],
    date: [
      {
        message: "La date doit être valide.",
        check: (input) => !isNaN(Date.parse(input)),
      },
    ],
    address: [],
  };
  
  // Fonction pour ajouter des règles dynamiques en fonction du pays et de la région
  async function addGeoLocationRules(countryCode, region) {
    // Règles pour la Tunisie
    if (countryCode === "TN") {
      rules.phone.push({
        message: "Le numéro de téléphone en Tunisie doit avoir 8 chiffres.",
        check: (input) => /^[0-9]{8}$/.test(input),
      });
      rules.postal.push({
        message: "Le code postal en Tunisie doit contenir 4 chiffres.",
        check: (input) => /^[0-9]{4}$/.test(input),
      });
    }
    // Règles pour la France
    else if (countryCode === "FR") {
      rules.phone.push({
        message: "Le numéro de téléphone en France doit avoir 10 chiffres.",
        check: (input) => /^[0-9]{10}$/.test(input),
      });
      rules.postal.push({
        message: "Le code postal en France doit contenir 5 chiffres.",
        check: (input) => /^[0-9]{5}$/.test(input),
      });
    }
  }
  
  // Fonction de détection de la région avec validation de l'adresse
  async function detectRegion() {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
  
          if (latitude && longitude) {
            try {
              const response = await fetch(`https://geocode.maps.co/reverse?lat=${latitude}&lon=${longitude}`);
              const data = await response.json();
  
              if (data && data.address) {
                const { road, city, country, country_code } = data.address;
                const regionCode = country_code?.toUpperCase();
  
                if (regionCode) {
                  // Mettre à jour l'adresse et appliquer les règles spécifiques à la région
                  const addressField = document.getElementById("address-input");
                  if (addressField) {
                    let address = "";
                    if (road) address += `${road}, `;
                    if (city) address += `${city}, `;
                    if (country) address += `${country}`;
                    addressField.value = address || "Adresse non disponible, veuillez la saisir manuellement.";
                  }
  
                  // Ajouter des règles spécifiques selon la région
                  addGeoLocationRules(regionCode);
                }
              } else {
                console.error("Aucune donnée d'adresse retournée.");
              }
            } catch (error) {
              console.warn("Erreur lors de la détection de la région :", error);
            }
          }
        },
        (error) => {
          console.warn("La géolocalisation a échoué :", error.message);
        }
      );
    } else {
      console.warn("La géolocalisation n'est pas disponible dans ce navigateur.");
    }
  }
  
  // Validation des champs
  function validateFields() {
    const fields = ["email", "date", "phone", "postal", "address"];
    fields.forEach((field) => {
      const inputField = document.getElementById(`${field}-input`);
      const feedback = document.getElementById(`${field}-feedback`);
      const successMessage = document.getElementById("success-message");
  
      inputField.addEventListener("input", function () {
        const value = inputField.value.trim();
        const fieldRules = rules[field];
        let allRulesPassed = true;
  
        // Validation des règles
        for (const rule of fieldRules) {
          if (!rule.check(value)) {
            feedback.textContent = rule.message;
            allRulesPassed = false;
            break;
          }
        }
  
        // Si toutes les règles sont respectées
        if (allRulesPassed) {
          feedback.textContent = "";
          const allFieldsValid = fields.every((f) => {
            const fInput = document.getElementById(`${f}-input`);
            return rules[f].every((rule) => rule.check(fInput.value.trim()));
          });
          successMessage.style.display = allFieldsValid ? "block" : "none";
        } else {
          successMessage.style.display = "none";
        }
      });
    });
  }
  
  // Fonction d'analyse de l'image avec Google Vision API
  async function analyzeImage(file) {
    const apiKey = "AIzaSyBU6GC8t_VFyRtCu0e5CEzNftT5yxWDqfs"; // Remplacez par votre clé API Google Vision
    const url = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;
  
    const base64Image = await fileToBase64(file);
  
    const requestPayload = {
      requests: [
        {
          image: { content: base64Image },
          features: [{ type: "SAFE_SEARCH_DETECTION" }],
        },
      ],
    };
  
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestPayload),
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Erreur API:", errorData.error);
        alert("Erreur API : " + JSON.stringify(errorData.error, null, 2));
        throw new Error("Erreur lors de l'analyse de l'image.");
      }
  
      const data = await response.json();
      return data.responses[0].safeSearchAnnotation;
    } catch (error) {
      console.error("Erreur lors de l'analyse de l'image:", error);
      alert("Erreur lors de l'analyse de l'image. Veuillez réessayer.");
    }
  }
  
  
  
  // Convertir l'image en base64
  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  }
  
  // Fonction pour gérer le téléchargement d'image
  function handleImageUpload() {
    const imageInput = document.getElementById("image-input");
    const feedback = document.getElementById("image-feedback");
    const imagePreview = document.getElementById("image-preview");
  
    imageInput.addEventListener("change", async () => {
      const file = imageInput.files[0];
      feedback.textContent = "";
      imagePreview.innerHTML = "";
  
      if (file) {
        try {
          const analysis = await analyzeImage(file);
  
          // Vérifiez les résultats de l'analyse pour détecter du contenu dangereux
          if (analysis.violence === "LIKELY" || analysis.violence === "VERY_LIKELY") {
            feedback.textContent = "L'image contient du contenu dangereux (violence détectée). Elle a été supprimée.";
            imageInput.value = ""; // Réinitialiser le champ
          } else if (analysis.adult === "LIKELY" || analysis.adult === "VERY_LIKELY") {
            feedback.textContent = "L'image contient du contenu inapproprié (adulte détecté). Elle a été supprimée.";
            imageInput.value = ""; // Réinitialiser le champ
          } else {
            // Afficher un aperçu de l'image
            const reader = new FileReader();
            reader.onload = (event) => {
              const img = document.createElement("img");
              img.src = event.target.result;
              imagePreview.appendChild(img);
            };
            reader.readAsDataURL(file);
          }
        } catch (error) {
          feedback.textContent = "Erreur lors de l'analyse de l'image : " + error.message;
        }
      }
    });
  }
  
  // Initialiser les validations et le gestionnaire d'image
  window.onload = () => {
    detectRegion(); // Détecte la région de l'utilisateur
    validateFields(); // Active la validation des champs
    handleImageUpload(); // Gère le téléchargement d'image
  };
  