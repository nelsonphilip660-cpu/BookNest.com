// =====================================
// BOOKNEST CONFIGURATION
// =====================================

const WHATSAPP_NUMBER = "2349037141652";
const EMAIL_ADDRESS = "nelsonphilip660@gmail.com";

const SUPABASE_URL = "https://cvlotelnirlwhwcehgqt.supabase.co";

// Replace this placeholder with your actual Supabase publishable key.
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_dPKqtLiX2sEfFmIFAENI9w_TPgbDsEG";

const formatMoney = amount =>
    "₦" + Number(amount).toLocaleString("en-NG");

const categoryNames = {
    Education: "Education",
    Stories: "Stories & Novels",
    History: "History",
    Documents: "Documents",
    Business: "Business"
};

// =====================================
// CONNECT TO SUPABASE
// =====================================

let db = null;
let books = [];

const bookGrid = document.getElementById("bookGrid");
const emptyMessage = document.getElementById("emptyMessage");
const catalogueStatus = document.getElementById("catalogueStatus");
const bookCount = document.getElementById("bookCount");

if (
    window.supabase &&
    SUPABASE_PUBLISHABLE_KEY !== "PASTE_YOUR_PUBLISHABLE_KEY_HERE"
) {
    db = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY
    );
}

// =====================================
// PAGE LOADER
// =====================================

window.addEventListener("load", () => {
    setTimeout(() => {
        document.getElementById("loader")?.classList.add("hide");
    }, 1200);
});

// FOOTER YEAR

document.getElementById("year").textContent =
    new Date().getFullYear();

// =====================================
// MOBILE NAVIGATION
// =====================================

const menuToggle = document.getElementById("menuToggle");
const navigation = document.getElementById("navigation");

menuToggle.addEventListener("click", () => {
    navigation.classList.toggle("open");
    menuToggle.textContent =
        navigation.classList.contains("open") ? "✕" : "☰";
});

navigation.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
        navigation.classList.remove("open");
        menuToggle.textContent = "☰";
    });
});

// =====================================
// DARK AND LIGHT THEME
// =====================================

const themeToggle = document.getElementById("themeToggle");

if (localStorage.getItem("bookNestTheme") === "dark") {
    document.body.classList.add("dark");
    themeToggle.textContent = "☀";
}

themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark");

    const isDark = document.body.classList.contains("dark");

    themeToggle.textContent = isDark ? "☀" : "☾";

    localStorage.setItem(
        "bookNestTheme",
        isDark ? "dark" : "light"
    );
});

// =====================================
// SAFE HTML TEXT
// =====================================

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);
}

// =====================================
// LOAD BOOKS FROM SUPABASE
// =====================================

function getCoverURL(path) {
    if (!path) return "book.avif";

    // Allow a full image URL if one was saved in the database.
    if (path.startsWith("https://") || path.startsWith("http://")) {
        return path;
    }

    const { data } = db.storage
        .from("book-covers")
        .getPublicUrl(path);

    return data.publicUrl;
}

function renderBooks() {
    if (!books.length) {
        bookGrid.innerHTML = "";
        filterBooks();
        return;
    }

    bookGrid.innerHTML = books.map(book => {
        const title = escapeHTML(book.title);
        const author = escapeHTML(book.author || "BookNest");
        const description = escapeHTML(
            book.description || "Discover this material from BookNest."
        );
        const category = escapeHTML(book.category || "Education");
        const price = Number(book.price_ngn) || 0;
        const cover = escapeHTML(getCoverURL(book.cover_path));
        const id = escapeHTML(book.id);
        const categoryLabel = escapeHTML(
            categoryNames[book.category] || book.category || "BOOK"
        );

        return `
            <article class="book-card"
                data-id="${id}"
                data-title="${title}"
                data-author="${author}"
                data-category="${category}"
                data-price="${price}">

                <div class="book-cover">
                    <img
                        src="${cover}"
                        alt="${title}"
                        loading="lazy"
                        onerror="this.onerror=null;this.src='book.avif';">

                    <span class="book-label">
                        ${categoryLabel.toUpperCase()}
                    </span>
                </div>

                <div class="book-info">
                    <span class="book-category">${categoryLabel}</span>

                    <h3>${title}</h3>

                    <p class="author">By ${author}</p>

                    <p class="description">${description}</p>

                    <div class="book-bottom">
                        <strong>${formatMoney(price)}</strong>

                        <button class="add-btn" type="button">
                            + Add to Cart
                        </button>
                    </div>
                </div>
            </article>
        `;
    }).join("");

    filterBooks();
}

async function loadBooks() {
    if (!db) {
        catalogueStatus.hidden = false;
        catalogueStatus.textContent =
            "Supabase is not configured. Please add your publishable key in script.js.";

        bookCount.textContent = "0 materials";
        return;
    }

    catalogueStatus.hidden = false;
    catalogueStatus.textContent = "Loading books from BookNest...";

    try {
        const { data, error } = await db
            .from("books")
            .select("id, title, author, description, category, price_ngn, cover_path, is_active, created_at")
            .eq("is_active", true)
            .order("created_at", { ascending: false });

        if (error) throw error;

        books = data || [];

        catalogueStatus.hidden = true;

        renderBooks();

        if (books.length === 0) {
            catalogueStatus.hidden = false;
            catalogueStatus.textContent =
                "No books have been added yet. Please check back soon.";
        }

    } catch (error) {
        console.error("BookNest catalogue error:", error);

        catalogueStatus.hidden = false;
        catalogueStatus.textContent =
            "We could not load the books right now. Please refresh the page and try again.";

        bookCount.textContent = "Unavailable";
    }
}

// =====================================
// SEARCH AND CATEGORY FILTER
// =====================================

const searchInput = document.getElementById("searchInput");
const searchForm = document.getElementById("searchForm");
const categoryButtons = document.querySelectorAll(".category-btn");

let selectedCategory = "All";

function filterBooks() {
    const search = searchInput.value.toLowerCase().trim();
    const bookCards = [...document.querySelectorAll(".book-card")];

    let visible = 0;

    bookCards.forEach(card => {
        const title = card.dataset.title.toLowerCase();
        const author = card.dataset.author.toLowerCase();
        const category = card.dataset.category.toLowerCase();

        const description =
            card.querySelector(".description").textContent.toLowerCase();

        const displayCategory =
            (categoryNames[card.dataset.category] || card.dataset.category)
                .toLowerCase();

        const matchesSearch =
            title.includes(search) ||
            author.includes(search) ||
            category.includes(search) ||
            displayCategory.includes(search) ||
            description.includes(search);

        const matchesCategory =
            selectedCategory === "All" ||
            card.dataset.category === selectedCategory;

        const show = matchesSearch && matchesCategory;

        card.hidden = !show;

        if (show) visible++;
    });

    emptyMessage.hidden =
        visible !== 0 || bookCards.length === 0;

    bookCount.textContent =
        `${visible} material${visible === 1 ? "" : "s"}`;
}

searchInput.addEventListener("input", filterBooks);

searchForm.addEventListener("submit", event => {
    event.preventDefault();
    filterBooks();

    document.getElementById("books").scrollIntoView({
        behavior: "smooth"
    });
});

categoryButtons.forEach(button => {
    button.addEventListener("click", () => {
        selectedCategory = button.dataset.category;

        categoryButtons.forEach(item =>
            item.classList.remove("active")
        );

        button.classList.add("active");

        filterBooks();

        document.getElementById("books").scrollIntoView({
            behavior: "smooth"
        });
    });
});

// =====================================
// HOME SEARCH
// =====================================

const homeSearchForm = document.getElementById("homeSearch");

if (homeSearchForm) {
    homeSearchForm.addEventListener("submit", event => {
        event.preventDefault();

        const homeInput =
            document.getElementById("homeSearchInput");

        const destination = new URL("index.html", window.location.href);

        destination.hash = "books";
        destination.searchParams.set("search", homeInput.value);

        window.location.href = destination.href;
    });
}

// Read search from URL if present

const urlSearch = new URLSearchParams(window.location.search);

if (urlSearch.has("search")) {
    searchInput.value = urlSearch.get("search");
}

// =====================================
// SHOPPING CART
// =====================================

let cart = [];

try {
    cart = JSON.parse(
        localStorage.getItem("bookNestCart")
    ) || [];

    if (!Array.isArray(cart)) cart = [];
} catch {
    cart = [];
}

const cartPanel = document.getElementById("cartPanel");
const cartOverlay = document.getElementById("cartOverlay");
const cartItems = document.getElementById("cartItems");
const cartTotal = document.getElementById("cartTotal");

function saveCart() {
    localStorage.setItem(
        "bookNestCart",
        JSON.stringify(cart)
    );
}

function openCart() {
    cartPanel.classList.add("show");
    cartOverlay.classList.add("show");
}

function closeCart() {
    cartPanel.classList.remove("show");
    cartOverlay.classList.remove("show");
}

document.getElementById("openCart")
    .addEventListener("click", openCart);

document.getElementById("floatingCart")
    .addEventListener("click", openCart);

document.getElementById("closeCart")
    .addEventListener("click", closeCart);

cartOverlay.addEventListener("click", closeCart);

// =====================================
// UPDATE CART DISPLAY
// =====================================

function updateCart() {
    const totalQuantity = cart.reduce(
        (sum, item) => sum + item.quantity,
        0
    );

    const totalPrice = cart.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
    );

    document.getElementById("cartCount").textContent =
        totalQuantity;

    document.getElementById("floatingCount").textContent =
        totalQuantity;

    cartTotal.textContent = formatMoney(totalPrice);

    if (cart.length === 0) {
        cartItems.innerHTML =
            '<p class="empty-cart">Your cart is empty. Add some books to get started.</p>';
    } else {
        cartItems.innerHTML = cart.map(item => `
            <div class="cart-item">
                <div>
                    <h4>${escapeHTML(item.name)}</h4>
                    <p>${formatMoney(item.price * item.quantity)}</p>
                </div>

                <div class="quantity-controls">
                    <button
                        data-action="minus"
                        data-id="${escapeHTML(item.id)}"
                        aria-label="Decrease quantity">−</button>

                    <span>${item.quantity}</span>

                    <button
                        data-action="plus"
                        data-id="${escapeHTML(item.id)}"
                        aria-label="Increase quantity">+</button>
                </div>
            </div>
        `).join("");
    }

    saveCart();
}

// =====================================
// ADD BOOK TO CART
// =====================================

// Event delegation allows newly loaded Supabase books to work.

bookGrid.addEventListener("click", event => {
    const button = event.target.closest(".add-btn");

    if (!button) return;

    const card = button.closest(".book-card");

    const id = card.dataset.id;
    const name = card.dataset.title;
    const price = Number(card.dataset.price);

    const existing = cart.find(item => item.id === id);

    if (existing) {
        existing.quantity++;
    } else {
        cart.push({
            id,
            name,
            price,
            quantity: 1
        });
    }

    updateCart();

    button.textContent = "Added ✓";
    button.disabled = true;

    setTimeout(() => {
        button.textContent = "+ Add to Cart";
        button.disabled = false;
    }, 900);
});

// =====================================
// CHANGE CART QUANTITY
// =====================================

cartItems.addEventListener("click", event => {
    const button = event.target.closest("button[data-action]");

    if (!button) return;

    const item = cart.find(
        product => product.id === button.dataset.id
    );

    if (!item) return;

    if (button.dataset.action === "plus") {
        item.quantity++;
    }

    if (button.dataset.action === "minus") {
        item.quantity--;

        if (item.quantity <= 0) {
            cart = cart.filter(
                product => product.id !== item.id
            );
        }
    }

    updateCart();
});

// =====================================
 // SUPABASE ORDER CHECKOUT
 // =====================================

const checkoutForm = document.getElementById("checkoutForm");
const placeOrderBtn = document.getElementById("placeOrderBtn");
const orderConfirmation = document.getElementById("orderConfirmation");
const receiptForm = document.getElementById("receiptForm");

let currentOrder = null;

checkoutForm.addEventListener("submit", async event => {
    event.preventDefault();

    if (!db) {
        alert("BookNest is not connected to Supabase.");
        return;
    }

    if (cart.length === 0) {
        alert("Your cart is empty. Please add a book first.");
        return;
    }

    // Ensure the cart contains real Supabase book IDs.
    const validUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (cart.some(item => !validUUID.test(String(item.id)))) {
        alert("Your cart contains an old item. Please remove it and add the book again.");
        return;
    }

    const customerName =
        document.getElementById("customerName").value.trim();

    const customerPhone =
        document.getElementById("customerPhone").value.trim();

    const customerEmail =
        document.getElementById("customerEmail").value.trim();

    if (!customerName || !customerPhone) {
        alert("Please enter your name and phone number.");
        return;
    }

    placeOrderBtn.disabled = true;
    placeOrderBtn.textContent = "Creating your order...";

    try {
        const response = await fetch(
            `${SUPABASE_URL}/functions/v1/create-order`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "apikey": SUPABASE_PUBLISHABLE_KEY
                },
                body: JSON.stringify({
                    customer_name: customerName,
                    customer_phone: customerPhone,
                    customer_email: customerEmail || null,
                    items: cart.map(item => ({
                        book_id: item.id,
                        quantity: item.quantity
                    }))
                })
            }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(
                result.message || result.error || "Unable to create your order."
            );
        }

        if (!result.order_id || !result.customer_token) {
            throw new Error(
                "The order was created, but its secure customer confirmation details were not returned. Contact BookNest before placing another order."
            );
        }

        currentOrder = {
            id: result.order_id,
            token: result.customer_token
        };

        // Keep the private customer token in this browser session.
        sessionStorage.setItem(
            "bookNestOrder_" + result.order_id,
            result.customer_token
        );

        const payment = result.payment || {};

        document.getElementById("orderReference").textContent =
            result.order_id;
            document.getElementById("customerDownloadCode").textContent =
    result.customer_token;

        document.getElementById("paymentBank").textContent =
            payment.bank || "OPay";

        document.getElementById("paymentName").textContent =
            payment.account_name || "Nelson Philip";

        document.getElementById("paymentNumber").textContent =
            payment.account_number || "9037141652";

        document.getElementById("paymentAmount").textContent =
            formatMoney(result.total_ngn);

        // Clear the cart only after successful order creation.
        cart = [];
        updateCart();

        checkoutForm.hidden = true;
        orderConfirmation.hidden = false;

        alert("Your BookNest order has been created successfully.");

    } catch (error) {
        console.error("BookNest order error:", error);
        alert(error.message || "Something went wrong. Please try again.");

    } finally {
        placeOrderBtn.disabled = false;
        placeOrderBtn.textContent = "Place Order →";
    }
});

// =====================================
// UPLOAD PAYMENT RECEIPT
// =====================================

receiptForm.addEventListener("submit", async event => {
    event.preventDefault();

    if (!currentOrder) {
        alert("Your order details are unavailable. Please use the same browser session in which you placed the order.");
        return;
    }

    const receiptFile =
        document.getElementById("receiptFile").files[0];

    const receiptButton =
        document.getElementById("receiptButton");

    const receiptMessage =
        document.getElementById("receiptMessage");

    if (!receiptFile) {
        alert("Please select your payment receipt.");
        return;
    }

    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "application/pdf"
    ];

    if (!allowedTypes.includes(receiptFile.type)) {
        alert("Upload a JPG, PNG, WebP or PDF receipt.");
        return;
    }

    if (receiptFile.size > 5 * 1024 * 1024) {
        alert("Your receipt must not be larger than 5MB.");
        return;
    }

    receiptButton.disabled = true;
    receiptButton.textContent = "Uploading receipt...";

    receiptMessage.textContent = "";

    try {
        const formData = new FormData();

        formData.append("order_id", currentOrder.id);
        formData.append("customer_token", currentOrder.token);
        formData.append("receipt", receiptFile);

        const response = await fetch(
            `${SUPABASE_URL}/functions/v1/upload-receipt`,
            {
                method: "POST",
                headers: {
                    "apikey": SUPABASE_PUBLISHABLE_KEY
                },
                body: formData
            }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(
                result.message || result.error || "Receipt upload failed."
            );
        }

        receiptMessage.textContent =
            "Receipt submitted successfully! Your payment is awaiting BookNest admin verification.";

        receiptForm.reset();

        receiptButton.textContent = "Receipt Submitted";

    } catch (error) {
        console.error("Receipt upload error:", error);

        receiptMessage.textContent =
            error.message || "Could not upload your receipt. Please try again.";

        receiptButton.disabled = false;
        receiptButton.textContent = "Submit Payment Receipt";
    }
});

// =====================================
// CUSTOMER BOOK DOWNLOADS
// =====================================

const downloadForm = document.getElementById("downloadForm");
const downloadButton = document.getElementById("downloadButton");
const downloadMessage = document.getElementById("downloadMessage");
const downloadResults = document.getElementById("downloadResults");

// Read purchased PDFs aloud in the browser. PDF.js extracts text locally;
// speechSynthesis provides playback without uploading document contents.
let activePdfReadToken = 0;
async function readPdfAloud(url, button) {
    if (!window.pdfjsLib || !("speechSynthesis" in window)) {
        downloadMessage.textContent = "Audio reading is not supported by this browser.";
        return;
    }
    const token = ++activePdfReadToken;
    window.speechSynthesis.cancel();
    button.disabled = true;
    button.textContent = "Loading PDF text…";
    try {
        const pdf = await window.pdfjsLib.getDocument({ url }).promise;
        for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) {
            if (token !== activePdfReadToken) return;
            const page = await pdf.getPage(pageNo);
            const content = await page.getTextContent();
            const text = content.items.map(item => item.str).join(" ").trim();
            if (text) {
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.onstart = () => { button.textContent = "Stop reading"; };
                utterance.onend = () => {
                    if (token === activePdfReadToken) {
                        button.disabled = false;
                        button.textContent = "🔊 Read aloud";
                    }
                };
                utterance.onerror = utterance.onend;
                window.speechSynthesis.speak(utterance);
            }
        }
        button.disabled = false;
        button.textContent = "Stop reading";
    } catch (error) {
        console.error("PDF audio reader error:", error);
        if (token === activePdfReadToken) {
            button.disabled = false;
            button.textContent = "🔊 Read aloud";
            downloadMessage.textContent = "Could not read this PDF. Try downloading it or check your connection.";
        }
    }
}

downloadForm.addEventListener("submit", async event => {
    event.preventDefault();

    const orderId = document.getElementById("downloadOrderId").value.trim();
    const customerToken = document.getElementById("downloadToken").value.trim();

    downloadButton.disabled = true;
    downloadButton.textContent = "Checking your order...";
    downloadMessage.textContent = "";
    downloadResults.replaceChildren();

    try {
        const response = await fetch(
            `${SUPABASE_URL}/functions/v1/customer-download`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "apikey": SUPABASE_PUBLISHABLE_KEY
                },
                body: JSON.stringify({
                    order_id: orderId,
                    customer_token: customerToken
                })
            }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(
                result.error || "Unable to retrieve your books."
            );
        }

        downloadMessage.textContent =
            "Your purchased books are ready!";

        result.downloads.forEach(book => {
            const item = document.createElement("div");
            item.className = "download-item";

            const title = document.createElement("h3");
            title.textContent = book.title;

            const link = document.createElement("a");
            link.href = book.download_url;
            link.textContent = "Download PDF ↓";
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            link.className = "btn primary";

            const readerLink = document.createElement("a");
            readerLink.href = `reader.html#pdf=${encodeURIComponent(book.download_url)}&title=${encodeURIComponent(book.title || "Your book")}`;
            readerLink.textContent = "Read on website";
            readerLink.className = "btn audio-reader-button";
            readerLink.target = "_blank";
            readerLink.rel = "noopener noreferrer";

            const readButton = document.createElement("button");
            readButton.type = "button";
            readButton.className = "btn audio-reader-button";
            readButton.textContent = "🔊 Read aloud";
            readButton.addEventListener("click", () => {
                if (window.speechSynthesis.speaking) {
                    ++activePdfReadToken;
                    window.speechSynthesis.cancel();
                    readButton.disabled = false;
                    readButton.textContent = "🔊 Read aloud";
                } else {
                    readPdfAloud(book.download_url, readButton);
                }
            });

            item.appendChild(title);
            item.appendChild(link);
            item.appendChild(readerLink);
            item.appendChild(readButton);

            downloadResults.appendChild(item);
        });

    } catch (error) {
        console.error("BookNest download error:", error);

        downloadMessage.textContent =
            error.message || "Download failed. Please try again.";

    } finally {
        downloadButton.disabled = false;
        downloadButton.textContent = "Access My Books →";
    }
});
// =====================================
// SCROLL REVEAL ANIMATIONS
// =====================================

const revealElements =
    document.querySelectorAll(".reveal");

if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("visible");
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.12
    });

    revealElements.forEach(element => {
        observer.observe(element);
    });
} else {
    revealElements.forEach(element => {
        element.classList.add("visible");
    });
}

// =====================================
// INITIALIZE WEBSITE
// =====================================

updateCart();

if (urlSearch.has("search")) {
    filterBooks();
}

loadBooks();
